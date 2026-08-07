// 1. On encapsule toute la logique dans une fonction réutilisable
function verifierEtAttribuerBadges() {
    console.log("⏱️ [CRON] Démarrage de la vérification quotidienne des badges...");

    // Vos paliers
    const paliersMessages = [
        { id: "0kh4pd8nd68kb36", requis: 100 },   // Message I
        { id: "0y2043c5dt1gk76", requis: 1000 },  // Message II
        { id: "v8jobh954c6w6s5", requis: 3000 },  // Message III
        { id: "y9re3r8l8fr2418", requis: 8000 },  // Message IV
        { id: "39eku1w1yoftjj5", requis: 15000 }  // Message V
    ];

    // 2. On demande à la base de données de faire la somme de TOUS les joueurs en 1 seule requête
    // Le "GROUP BY discord_user" permet d'avoir le total par utilisateur.
    const resultats = arrayOf(new DynamicModel({
        "discord_user": "",
        "total": 0
    }));

    $app.dao().db()
        .select("discord_user", "SUM(message_count) as total")
        .from("discord_user_stats")
        .groupBy("discord_user")
        .all(resultats);

    const collectionBadgesEarned = $app.dao().findCollectionByNameOrId("badges_earned");
    let compteNouveauxBadges = 0;

    // 3. On boucle sur chaque joueur renvoyé par la base de données
    for (const stats of resultats) {
        const userId = stats.discord_user;
        const totalMessages = stats.total || 0;

        // On récupère les badges que CE joueur possède déjà
        const badgesDejaPossedes = $app.dao().findRecordsByFilter(
            "badges_earned",
            `discord_user = '${userId}'`
        );
        const idsPossedes = badgesDejaPossedes.map(b => b.get("badge"));

        // On vérifie s'il a franchi un nouveau palier
        for (const palier of paliersMessages) {
            if (totalMessages >= palier.requis && !idsPossedes.includes(palier.id)) {

                // On attribue le badge manquant
                const nouveauBadge = new Record(collectionBadgesEarned);
                nouveauBadge.set("discord_user", userId);
                nouveauBadge.set("badge", palier.id);

                $app.dao().saveRecord(nouveauBadge);

                console.log(`🎉 [CRON] Nouveau badge débloqué pour ${userId} ! (Total: ${totalMessages})`);
                compteNouveauxBadges++;
            }
        }
    }

    console.log(`✅ [CRON] Vérification terminée ! ${compteNouveauxBadges} nouveau(x) badge(s) distribué(s).`);
}

// -----------------------------------------------------------------
// DÉCLENCHEURS (TRIGGERS)
// -----------------------------------------------------------------

// A) S'exécute automatiquement une seule fois quand PocketBase démarre
onAfterBootstrap((e) => {
    verifierEtAttribuerBadges();
});

// B) S'exécute ensuite toutes les 24h (ici, configuré pour minuit tous les jours)
// L'expression "0 0 * * *" est le format standard cron pour dire "À 00h00 chaque jour"
cronAdd("verification_badges_quotidienne", "0 0 * * *", () => {
    verifierEtAttribuerBadges();
});