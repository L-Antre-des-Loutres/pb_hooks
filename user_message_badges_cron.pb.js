// ==========================================
// 1. CONFIGURATION DES PALIERS
// ==========================================
const PALIERS_MESSAGES = [
    { id: "0kh4pd8nd68kb36", requis: 100 },
    { id: "0y2043c5dt1gk76", requis: 1000 },
    { id: "v8jobh954c6w6s5", requis: 3000 },
    { id: "y9re3r8l8fr2418", requis: 8000 },
    { id: "39eku1w1yoftjj5", requis: 15000 }
];

// ==========================================
// 2. FONCTIONS DE VÉRIFICATION (Partagées)
// ==========================================

// Vérifie un seul utilisateur (Très rapide, utilisé à chaque message du bot)
function verifierUnUtilisateur(userId) {
    if (!userId) return;

    const result = new DynamicModel({ "total": 0 });
    $app.db()
        .select("SUM(message_count) as total")
        .from("discord_user_stats")
        .where($dbx.hashExp({ "discord_user": userId }))
        .one(result);

    const totalMessages = result.total || 0;

    const badgesDejaPossedes = $app.findAllRecords("badges_earned", $dbx.hashExp({ "discord_user": userId }));
    const idsPossedes = badgesDejaPossedes.map(b => b.get("badge"));
    const collectionBadgesEarned = $app.findCollectionByNameOrId("badges_earned");

    for (const palier of PALIERS_MESSAGES) {
        if (totalMessages >= palier.requis && !idsPossedes.includes(palier.id)) {
            const nouveauBadge = new Record(collectionBadgesEarned);
            nouveauBadge.set("discord_user", userId);
            nouveauBadge.set("badge", palier.id);
            $app.save(nouveauBadge);
            console.log(`🎉 [DIRECT] Badge débloqué pour ${userId} ! (Total: ${totalMessages})`);
        }
    }
}

// Vérifie TOUS les utilisateurs (Plus lourd, utilisé par le CRON 1 fois par jour)
function verifierTousLesUtilisateurs() {
    console.log("⏱️ [CRON] Démarrage de la vérification globale des badges...");

    const resultats = arrayOf(new DynamicModel({
        "discord_user": "",
        "total": 0
    }));

    $app.db()
        .select("discord_user", "SUM(message_count) as total")
        .from("discord_user_stats")
        .groupBy("discord_user")
        .all(resultats);

    const collectionBadgesEarned = $app.findCollectionByNameOrId("badges_earned");
    let compte = 0;

    for (const stats of resultats) {
        const userId = stats.discord_user;
        if (!userId) continue;

        const totalMessages = stats.total || 0;
        const badgesDejaPossedes = $app.findAllRecords("badges_earned", $dbx.hashExp({ "discord_user": userId }));
        const idsPossedes = badgesDejaPossedes.map(b => b.get("badge"));

        for (const palier of PALIERS_MESSAGES) {
            if (totalMessages >= palier.requis && !idsPossedes.includes(palier.id)) {
                const nouveauBadge = new Record(collectionBadgesEarned);
                nouveauBadge.set("discord_user", userId);
                nouveauBadge.set("badge", palier.id);
                $app.save(nouveauBadge);
                console.log(`🎉 [CRON] Badge débloqué pour ${userId} !`);
                compte++;
            }
        }
    }
    console.log(`✅ [CRON] Vérification terminée ! ${compte} badge(s) distribué(s).`);
}

// ==========================================
// 3. DÉCLENCHEURS (TRIGGERS)
// ==========================================

// A. À chaque nouvelle statistique envoyée par le bot Discord
onRecordCreateRequest((e) => {
    e.next(); // Sauvegarde la nouvelle ligne d'abord
    verifierUnUtilisateur(e.record.get("discord_user")); // Puis vérifie ses badges
}, "discord_user_stats");

// B. Au démarrage du serveur PocketBase
onBootstrap((e) => {
    e.next();
    verifierTousLesUtilisateurs();
});

// C. Tous les jours à minuit
cronAdd("verification_badges_quotidienne", "0 0 * * *", () => {
    verifierTousLesUtilisateurs();
});