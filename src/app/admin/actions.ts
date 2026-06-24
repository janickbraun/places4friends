"use server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function checkAdminStatus(): Promise<{ isAdmin: boolean; email?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return { isAdmin: false };
    }

    const adminEmailsStr = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsStr.split(",").map((e) => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(user.email.toLowerCase());

    return { isAdmin, email: user.email };
  } catch (error) {
    console.error("Fehler bei der Admin-Prüfung:", error);
    return { isAdmin: false };
  }
}

export async function getAdminData() {
  const { isAdmin } = await checkAdminStatus();
  if (!isAdmin) {
    throw new Error("Nicht autorisiert. Zugriff verweigert.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase-Admin-Client konnte nicht initialisiert werden.");
  }

  // Fetch counts from different tables
  const [
    usersRes,
    activitiesRes,
    wishlistRes,
    friendshipsRes,
    invitesRes,
    commentsRes,
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("activities").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("wishlist").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("friendships").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("friend_invite_links").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("activity_comments").select("*", { count: "exact", head: true }),
  ]);

  if (usersRes.error) throw usersRes.error;
  if (activitiesRes.error) throw activitiesRes.error;

  // Fetch all friendships to count status breakdown
  const { data: friendshipsData } = await supabaseAdmin
    .from("friendships")
    .select("status");

  const pendingFriendships = friendshipsData?.filter((f) => f.status === "pending").length || 0;
  const acceptedFriendships = friendshipsData?.filter((f) => f.status === "accepted").length || 0;

  // Fetch invite links usage
  const { data: invitesData } = await supabaseAdmin
    .from("friend_invite_links")
    .select("use_count, max_uses");

  const totalInviteUses = invitesData?.reduce((sum, item) => sum + (item.use_count || 0), 0) || 0;

  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name, created_at, avatar_url, banned_at")
    .order("created_at", { ascending: false });

  if (profilesError) throw profilesError;

  // Fetch auth users to map emails
  const { data: authUsersRes, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
  if (authUsersError) throw authUsersError;
  const authUsers = authUsersRes.users || [];

  // Fetch all activities
  const { data: allActivities, error: actError } = await supabaseAdmin
    .from("activities")
    .select("id, user_id, place_name, place_address, categories, is_superlike, created_at, image_urls, description")
    .order("created_at", { ascending: false });

  if (actError) throw actError;

  const userActivityCounts = allActivities.reduce((acc: Record<string, number>, curr) => {
    if (curr.user_id) {
      acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
    }
    return acc;
  }, {});

  // Compute category distribution and superlikes
  const categoryCounts: Record<string, number> = {};
  let totalSuperlikes = 0;
  allActivities.forEach((act) => {
    if (act.is_superlike) totalSuperlikes++;
    if (Array.isArray(act.categories)) {
      act.categories.forEach((cat) => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    }
  });

  // Enrich user profiles
  const enrichedUsers = profiles.map((p) => {
    const authUser = authUsers.find((au) => au.id === p.id);
    return {
      id: p.id,
      username: p.username || "Kein Username",
      full_name: p.full_name || "Kein Name",
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      email: authUser?.email || "Keine E-Mail",
      activityCount: userActivityCounts[p.id] || 0,
      banned: !!p.banned_at,
    };
  });

  // Enrich activities
  const enrichedActivities = allActivities.map((act) => {
    const creator = profiles.find((p) => p.id === act.user_id);
    return {
      id: act.id,
      place_name: act.place_name,
      place_address: act.place_address || "",
      categories: Array.isArray(act.categories) ? act.categories : [],
      is_superlike: act.is_superlike,
      created_at: act.created_at,
      image_urls: Array.isArray(act.image_urls) ? act.image_urls : [],
      description: act.description || "",
      user: creator
        ? {
            id: creator.id,
            username: creator.username || "Kein Username",
            full_name: creator.full_name || "Kein Name",
            avatar_url: creator.avatar_url,
          }
        : null,
    };
  });

  // Fetch invite links
  const { data: rawInvites, error: invitesErr } = await supabaseAdmin
    .from("friend_invite_links")
    .select("id, creator_id, token, use_count, max_uses, expires_at, created_at")
    .order("created_at", { ascending: false });

  if (invitesErr) throw invitesErr;

  const enrichedInvites = rawInvites.map((inv) => {
    const creator = profiles.find((p) => p.id === inv.creator_id);
    return {
      id: inv.id,
      token: inv.token,
      use_count: inv.use_count,
      max_uses: inv.max_uses,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      creator: creator
        ? {
            id: creator.id,
            username: creator.username || "Kein Username",
            full_name: creator.full_name || "Kein Name",
          }
        : null,
    };
  });

  // Fetch pending reports (newest first), enriched with the reported post + author + reporter.
  const { data: rawReports, error: reportsErr } = await supabaseAdmin
    .from("reports")
    .select("id, created_at, activity_id, reporter_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (reportsErr) throw reportsErr;

  const enrichedReports = (rawReports ?? []).map((r) => {
    const activity = allActivities.find((a) => a.id === r.activity_id) || null;
    const author = activity ? profiles.find((p) => p.id === activity.user_id) || null : null;
    const authorAuth = author ? authUsers.find((au) => au.id === author.id) : null;
    const reporter = profiles.find((p) => p.id === r.reporter_id) || null;
    return {
      id: r.id,
      created_at: r.created_at,
      activity: activity
        ? {
            id: activity.id,
            place_name: activity.place_name,
            description: activity.description || "",
            image_urls: Array.isArray(activity.image_urls) ? activity.image_urls : [],
          }
        : null,
      author: author
        ? {
            id: author.id,
            full_name: author.full_name || "Kein Name",
            username: author.username || "Kein Username",
            email: authorAuth?.email || "Keine E-Mail",
          }
        : null,
      reporter: reporter
        ? {
            id: reporter.id,
            full_name: reporter.full_name || "Kein Name",
            username: reporter.username || "Kein Username",
          }
        : null,
    };
  });

  return {
    stats: {
      users: usersRes.count || 0,
      activities: activitiesRes.count || 0,
      wishlist: wishlistRes.count || 0,
      friendships: friendshipsRes.count || 0,
      pendingFriendships,
      acceptedFriendships,
      invites: invitesRes.count || 0,
      inviteUses: totalInviteUses,
      comments: commentsRes.count || 0,
      superlikes: totalSuperlikes,
      reportsPending: enrichedReports.length,
    },
    categoryCounts,
    users: enrichedUsers,
    activities: enrichedActivities,
    invites: enrichedInvites,
    reports: enrichedReports,
  };
}

export async function deleteActivityAdmin(activityId: string) {
  const { isAdmin } = await checkAdminStatus();
  if (!isAdmin) {
    throw new Error("Nicht autorisiert. Zugriff verweigert.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase-Admin-Client konnte nicht initialisiert werden.");
  }

  // Fetch image URLs to clean storage
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("image_urls")
    .eq("id", activityId)
    .maybeSingle();

  // 1. Delete associated activity comments
  const { error: commentsError } = await supabaseAdmin
    .from("activity_comments")
    .delete()
    .eq("activity_id", activityId);

  if (commentsError) {
    console.error("Admin-Fehler beim Löschen der Kommentare:", commentsError);
  }

  // 2. Delete associated wishlist entries
  const { error: wishlistError } = await supabaseAdmin
    .from("wishlist")
    .delete()
    .eq("activity_id", activityId);

  if (wishlistError) {
    console.error("Admin-Fehler beim Löschen der Wunschliste:", wishlistError);
  }

  // 3. Delete the activity itself
  const { data, error } = await supabaseAdmin
    .from("activities")
    .delete()
    .eq("id", activityId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Admin-Fehler beim Löschen der Aktivität:", error);
    throw new Error("Empfehlung konnte nicht gelöscht werden.");
  }

  if (!data) {
    throw new Error("Empfehlung nicht gefunden.");
  }

  // Clean up storage files if present
  if (activity?.image_urls && activity.image_urls.length > 0) {
    const fileNames = activity.image_urls.map((url: string) => {
      const parts = url.split("/");
      return parts[parts.length - 1];
    });
    if (fileNames.length > 0) {
      const { error: storageErr } = await supabaseAdmin.storage
        .from("activity-images")
        .remove(fileNames);
      if (storageErr) {
        console.error("Admin-Fehler beim Löschen der Bilder aus dem Storage:", storageErr);
      }
    }
  }

  return { success: true, id: activityId };
}

export async function deleteInviteLinkAdmin(linkId: string) {
  const { isAdmin } = await checkAdminStatus();
  if (!isAdmin) {
    throw new Error("Nicht autorisiert. Zugriff verweigert.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase-Admin-Client konnte nicht initialisiert werden.");
  }

  const { error } = await supabaseAdmin
    .from("friend_invite_links")
    .delete()
    .eq("id", linkId);

  if (error) {
    console.error("Admin-Fehler beim Löschen des Einladungslinks:", error);
    throw new Error("Einladungslink konnte nicht gelöscht werden.");
  }

  return { success: true, id: linkId };
}

/**
 * Resolve a reported post. `delete_post` removes just the post (reuses the
 * activity-delete cleanup); `ban_user` bans the post's author from logging in and
 * deletes ALL of their posts + comments; `ignore` dismisses the report.
 * Returns the affected author id (for `ban_user`) so the client can prune the list.
 */
export async function resolveReportAdmin(
  reportId: string,
  action: "ban_user" | "delete_post" | "ignore"
) {
  const { isAdmin } = await checkAdminStatus();
  if (!isAdmin) {
    throw new Error("Nicht autorisiert. Zugriff verweigert.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase-Admin-Client konnte nicht initialisiert werden.");
  }

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, activity_id")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) {
    throw new Error("Meldung nicht gefunden.");
  }

  if (action === "ignore") {
    await supabaseAdmin
      .from("reports")
      .update({ status: "dismissed", resolution: "ignored", resolved_at: new Date().toISOString() })
      .eq("id", reportId);
    return { success: true, activityId: report.activity_id };
  }

  if (action === "delete_post") {
    // Deletes the post + its comments/wishlist + storage; the report row is then
    // cascade-deleted via the reports.activity_id FK (ON DELETE CASCADE).
    await deleteActivityAdmin(report.activity_id);
    return { success: true, activityId: report.activity_id };
  }

  // action === "ban_user": ban the post's author and wipe all their content.
  const { data: activity } = await supabaseAdmin
    .from("activities")
    .select("user_id")
    .eq("id", report.activity_id)
    .maybeSingle();

  const authorId = activity?.user_id;
  if (!authorId) {
    throw new Error("Beitrag oder Autor nicht gefunden.");
  }

  // 1. Ban login (≈100 years).
  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(authorId, {
    ban_duration: "876000h",
  });
  if (banErr) {
    console.error("Admin-Fehler beim Bannen des Nutzers:", banErr);
    throw new Error("Nutzer konnte nicht gebannt werden.");
  }
  await supabaseAdmin
    .from("profiles")
    .update({ banned_at: new Date().toISOString() })
    .eq("id", authorId);

  // 2. Delete all of the author's posts (reuses comment/wishlist/storage cleanup;
  //    cascade-deletes any reports on those posts).
  const { data: authorActivities } = await supabaseAdmin
    .from("activities")
    .select("id")
    .eq("user_id", authorId);

  for (const act of authorActivities ?? []) {
    try {
      await deleteActivityAdmin(act.id);
    } catch (err) {
      console.error("Admin-Fehler beim Löschen eines Beitrags des gebannten Nutzers:", err);
    }
  }

  // 3. Delete the author's comments on other users' posts.
  await supabaseAdmin.from("activity_comments").delete().eq("user_id", authorId);

  return { success: true, authorId };
}

/** Lift a ban: re-enable login and clear the profile's banned_at marker. */
export async function unbanUserAdmin(userId: string) {
  const { isAdmin } = await checkAdminStatus();
  if (!isAdmin) {
    throw new Error("Nicht autorisiert. Zugriff verweigert.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase-Admin-Client konnte nicht initialisiert werden.");
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) {
    console.error("Admin-Fehler beim Entbannen des Nutzers:", error);
    throw new Error("Bann konnte nicht aufgehoben werden.");
  }
  await supabaseAdmin.from("profiles").update({ banned_at: null }).eq("id", userId);

  return { success: true, id: userId };
}
