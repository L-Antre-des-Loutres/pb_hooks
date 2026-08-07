// On écoute la création de nouvelles statistiques
onRecordAfterCreateRequest((e) => {
    const userId = e.record.get("discord_user");

    // 1. Définir vos paliers avec les vrais IDs issus de image_d8fdfc.png
    const paliersMessages = [
        { id: "0kh4pd8nd68kb36", requis: 100 },   // Message I
        { id: "0y2043c5dt1gk76", requis: 1000 },  // Message II
        { id: "v8jobh954c6w6s5", requis: 3000 },  // Message III
        { id: "y9re3r8l8fr2418", requis: 8000 },  // Message IV
        { id: "39eku1w1yoftjj5", requis: 15000 }  // Message V
    ];

    // 2. Calculer le total des messages du joueur
    const result = new DynamicModel({ "total": 0 });

    $app.dao().db()
        .select("SUM(message_count) as total")
        .from("discord_user_stats")
        .where($dbx.hashExp({ "discord_user": userId }))
        .one(result);

    const totalMessages = result.total || 0; // || 0 par sécurité si c'est null

    // 3. Récupérer TOUS les badges que l'utilisateur possède déjà (En 1 seule requête)
    const badgesDejaPossedes = $app.dao().findRecordsByFilter(
        "badges_earned",
        `discord_user = '${userId}'`
    );

    // On extrait juste une liste d'IDs pour faciliter la comparaison (ex: ["0kh4pd8nd68kb36", ...])
    const idsPossedes = badgesDejaPossedes.map(b => b.get("badge"));

    // 4. Parcourir les paliers pour voir s'il y a de nouveaux badges à attribuer
    const collectionBadgesEarned = $app.dao().findCollectionByNameOrId("badges_earned");

    for (const palier of paliersMessages) {
        // Si le total est suffisant ET que le joueur n'a PAS encore ce badge précis
        if (totalMessages >= palier.requis && !idsPossedes.includes(palier.id)) {

            // On lui attribue !
            const nouveauBadge = new Record(collectionBadgesEarned);
            nouveauBadge.set("discord_user", userId);
            nouveauBadge.set("badge", palier.id);

            $app.dao().saveRecord(nouveauBadge);

            console.log(`🎉 Nouveau badge débloqué pour ${userId} ! (Palier : ${palier.requis} msgs)`);
        }
    }

}, "discord_user_stats");