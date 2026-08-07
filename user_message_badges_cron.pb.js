// Syntaxe PocketBase v0.23+
function verifierEtAttribuerBadges() {
    console.log("⏱️ [CRON] Démarrage de la vérification quotidienne des badges...");

    const paliersMessages = [
        { id: "0kh4pd8nd68kb36", requis: 100 },
        { id: "0y2043c5dt1gk76", requis: 1000 },
        { id: "v8jobh954c6w6s5", requis: 3000 },
        { id: "y9re3r8l8fr2418", requis: 8000 },
        { id: "39eku1w1yoftjj5", requis: 15000 }
    ];

    const resultats = arrayOf(new DynamicModel({
        "discord_user": "",
        "total": 0
    }));

    // On groupe les statistiques de tout le monde
    $app.db()
        .select("discord_user", "SUM(message_count) as total")
        .from("discord_user_stats")
        .groupBy("discord_user")
        .all(resultats);

    const collectionBadgesEarned = $app.findCollectionByNameOrId("badges_earned");
    let compteNouveauxBadges = 0;

    for (const stats of resultats) {
        const userId = stats.discord_user;
        const totalMessages = stats.total || 0;

        const badgesDejaPossedes = $app.findAllRecords(
            "badges_earned",
            $dbx.hashExp({ "discord_user": userId })
        );
        const idsPossedes = badgesDejaPossedes.map(b => b.get("badge"));

        for (const palier of paliersMessages) {
            if (totalMessages >= palier.requis && !idsPossedes.includes(palier.id)) {
                const nouveauBadge = new Record(collectionBadgesEarned);
                nouveauBadge.set("discord_user", userId);
                nouveauBadge.set("badge", palier.id);

                $app.save(nouveauBadge);
                console.log(`🎉 [CRON] Nouveau badge pour ${userId} !`);
                compteNouveauxBadges++;
            }
        }
    }
    console.log(`✅ [CRON] Vérification terminée ! ${compteNouveauxBadges} badge(s) distribué(s).`);
}

// -----------------------------------------------------------------
// DÉCLENCHEURS (TRIGGERS)
// -----------------------------------------------------------------

// S'exécute au démarrage (remplace onAfterBootstrap)
onBootstrap((e) => {
    e.next();
    verifierEtAttribuerBadges();
});

// S'exécute tous les jours à minuit
cronAdd("verification_badges_quotidienne", "0 0 * * *", () => {
    verifierEtAttribuerBadges();
});