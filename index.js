// Configuration
const config = require('./config');
// Driver SQL
const Sequelize = require('sequelize');
const { Op } = require("sequelize");
// Couleurs de la console
var colors = require('colors');

// API discord
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Moment JS
var moment = require('moment');  

////////////////////////////////////////////////////////////////
// MODELES DES TABLES
////////////////////////////////////////////////////////////////

// Connexion à la base de données
const sequelize = new Sequelize(config.get("BDD_NAME"), config.get("BDD_USER"), config.get("BDD_PASSWORD"), {
	host: config.get("BDD_HOST"),
	dialect: 'mariadb',
	logging: false,
});

// Paramètres du bot
const botSettings = sequelize.define('bot_settings', {
	name: { type: Sequelize.STRING(128), primaryKey: true },
	value: Sequelize.STRING(512),
}, {
	timestamps: false
});

// Paramètres des membres
const memberSettings = sequelize.define('bot_memberSettings', {
	memberId: { type: Sequelize.BIGINT(255), primaryKey: true },
	name: { type: Sequelize.STRING(128), primaryKey: true },
	value: Sequelize.STRING(512),
}, {
	timestamps: false
});

// Messages envoyés (pour les logs) (seront supprimés de la bdd après 30j, archivés quelques part sur mon serveur)
const discordMessages = sequelize.define('bot_messages', {
	messageId: { type: Sequelize.BIGINT(255), primaryKey: true },
	channelId: Sequelize.BIGINT(255),
	memberId: Sequelize.BIGINT(255),
	content: Sequelize.TEXT,
	date: Sequelize.DATE,
}, {
	timestamps: false
});


////////////////////////////////////////////////////////////////

const commands = [{
	name: 'ping',
	description: 'Répond avec pong!'
},
{
	name: 'setanniv',
	description: 'Permet de définir ta date d\'anniversaire (usage unique).',
	options: [{
		name: "date", // no uppercase as well
		description: "Date au format MM/DD/YYYY - 12/31/2001 - c'est relou je sais",
		type: 3,
		required: true
	}]
},
{
	name: 'delanniv',
	description: '[Admin] Supprime la date d\'anniversaire d\'un membre.',
	options: [{
		name: "membre", // no uppercase as well
		description: "Membre à supprimer la date d'anniversaire.",
		type: 6,
		required: true
	}]
},
{
	name: 'play',
	description: 'Permet de jouer une musique.',
	options: [{
		name: "titre", // no uppercase as well
		description: "Titre de la vidéo sur YouTube",
		type: 3,
		required: true
	}]
},
{
	name: 'playlist',
	description: 'Permet de jouer une playliste.',
	options: [{
		name: "titre", // no uppercase as well
		description: "Titre de la playlist sur YouTube",
		type: 3,
		required: true
	}]
},
{
	name: 'skip',
	description: 'Passe à la musique suivante'
},
{
	name: 'stop',
	description: 'Stoppe la musique'
},
{
	name: 'remove-loop',
	description: 'Supprimer la boucle'
},
{
	name: 'toggle-loop',
	description: 'Activer la boucle'
},
{
	name: 'toggle-queue-loop',
	description: 'Activer la boucle de la liste'
},
{
	name: 'set-volume',
	description: 'Permet de régler le volume.',
	options: [{
		name: "volume", // no uppercase as well
		description: "Volume en %.",
		type: 4,
		required: true
	}]
},
{
	name: 'seek',
	description: 'Prrr pas encore testé x)'
},
{
	name: 'clear-queue',
	description: 'Vide la file de lecture'
},
{
	name: 'shuffle',
	description: 'Ca fait penser à waffle'
},
{
	name: 'get-queue',
	description: 'Permet de voir la file d\'attente.'
},
{
	name: 'get-volume',
	description: 'Permet de voir le niveau de volume.'
},
{
	name: 'now-playing',
	description: 'Permet de voir la musique actuelle.'
},
{
	name: 'pause',
	description: 'Met la musique en pause.'
},
{
	name: 'resume',
	description: 'Reprend la musique'
},
{
	name: 'remove',
	description: 'Supprime la musique actuelle (pas de tout internet, malheuresement)'
},
{
	name: 'create-progress-bar',
	description: 'Permet de créer une barre de progression (pour la musique)'
}];

////////////////////////////////////////////////////////////////
// INITIALISATION DES COMMANDES ET CONNEXION À LA BASE DE DONNÉES
////////////////////////////////////////////////////////////////
const rest = new REST({ version: '9' }).setToken(config.get("DISCORD_BOT_TOKEN"));

(async () => {
	console.log('['+'INFO'.yellow+'] Connexion à la base de donnée...'.brightWhite);
	try {
		await sequelize.authenticate();
		console.log('['+'SUCCES'.brightGreen+'] Connexion à la base de donnée réussie.'.brightWhite);
		await initialiseDatabaseTables(); // On va initialiser les tables de la base de donnée
		
		try {
			console.log('['+'INFO'.yellow+'] Actualisation des commandes...'.brightWhite);
			//console.log(JSON.stringify(commands));
			await rest.put(
				Routes.applicationGuildCommands(config.get("CLIENT_ID"), config.get("GUILD_ID")),
				{ body: commands },
			);
	
			console.log('['+'SUCCES'.brightGreen+'] Toutes les commandes ont été actualisées.');
		} catch (error) {
			console.error('['+'ERREUR'.brightRed+'] Erreur lors de l\'actualisation des commandes:'.brightWhite+error);
		}
	} catch (error) {
		console.log('['+'ERREUR'.brightRed+'] Erreur lors de la connexion à la base de donnée:'.brightWhite);
		console.log('['+'DEBUG'.yellow+'] '.brightWhite+config.get("BDD_USER")+":"+config.get("BDD_PASSWORD")+"@"+config.get("BDD_HOST")+" db:"+config.get("BDD_NAME")+'\n');
		console.error(error);
	}
	
})();

async function initialiseDatabaseTables(){
	console.log('['+'INFO'.yellow+'] Initialisation des tables...'.brightWhite);
	try{
		await botSettings.sync();
		await memberSettings.sync();
		await discordMessages.sync();

		// Basiquement on regarde si l'entrée existe, puis on agit en conséquence
		let token = await botSettings.findOne({where: {name: "token" }});
		if(token == null){
			// INSERT si elle n'existe pas
			console.log('['+'INSERT'.brightMagenta+'] Insertion de token'.brightWhite);
			let token = botSettings.create({
				name: "token",
				value: config.get("DISCORD_BOT_TOKEN")
			});
		}else{
			// UPDATE si différente
			if(token.value != config.get("DISCORD_BOT_TOKEN")){
				token.update({value: config.get("DISCORD_BOT_TOKEN")})
				.then(updatedRecord => {
					console.log('['+'UPDATE'.brightMagenta+'] Mise à jour du token dans la base de donnée'.brightWhite);
				}).catch(err => {
					console.log('['+'ERREUR'.brightRed+'] Erreur lors de la màj de token dans la base de donnée: '.brightWhite+'\n');
					throw new Error(err);
				});
			}
		}

		// Et c'est pareil à chaque fois
		let clientId = await botSettings.findOne({where: {name: "clientId" }});
		if(clientId == null){
			console.log('['+'INSERT'.brightMagenta+'] Insertion de clientId'.brightWhite);
			let clientId = botSettings.create({
				name: "clientId",
				value: config.get("CLIENT_ID")
			});
		}else{
			if(clientId.value != config.get("CLIENT_ID")){
				clientId.update({value: config.get("CLIENT_ID")})
				.then(updatedRecord => {
					console.log('['+'UPDATE'.brightMagenta+'] Mise à jour du clientId dans la base de donnée'.brightWhite);
				}).catch(err => {
					console.log('['+'ERREUR'.brightRed+'] Erreur lors de la màj de clientId dans la base de donnée: '.brightWhite+'\n');
					throw new Error(err);
				});
			}
		}

		let guildId = await botSettings.findOne({where: {name: "guildId" }});
		if(guildId == null){
			console.log('['+'INSERT'.brightMagenta+'] Insertion de guildId'.brightWhite);
			let guildId = botSettings.create({
				name: "guildId",
				value: config.get("GUILD_ID")
			});
		}else{
			if(guildId.value != config.get("GUILD_ID")){
				guildId.update({value: config.get("GUILD_ID")})
				.then(updatedRecord => {
					console.log('['+'UPDATE'.brightMagenta+'] Mise à jour du guildId dans la base de donnée'.brightWhite);
				}).catch(err => {
					console.log('['+'ERREUR'.brightRed+'] Erreur lors de la màj de guildId dans la base de donnée: '.brightWhite+'\n');
					throw new Error(err);
				});
			}
		}

		console.log('['+'SUCCES'.brightGreen+'] Tables initialisées avec succès.'.brightWhite);
	} catch (error) {
		console.error('['+'ERREUR'.brightRed+'] Erreur lors de l\'initialisation des tables:'.brightWhite+'\n', error);
	}
	
}

////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////
// CONSOLE
////////////////////////////////////////////////////////////////

// Console Input/Output
var readline = require('readline');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ce code est a améliorer, je l'ai vulgairement recopié d'un ancien bot (lui même pas très bien conçu)
var recursiveAsyncReadLine = function () {
  rl.question('Commande: ', function (answer) {
    //if (answer == 'exit')
    //  return rl.close();
    const args = answer.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g);
	const command = args.shift().toLowerCase();

	switch(command){
		case "say":
			if(!args[0] || !args[1])
				console.log('\n'+'['+'ERREUR'.brightRed+"] Tu n'as pas mis d'arguments :p"+'\n'+'['+'INFO'.yellow+"] Usage: say <Numéro du canal> <\"Texte\">");
			else {
				var message = args[1].substring(1, args[1].length-1);
				client.channels.cache.get(args[0]).send(message);
				console.log('\n'+'['+'SUCCES'.brightGreen+'] Le message a été envoyé dans le canal n°'+args[0]);
			}
			break;

		default:
			console.log('\n'+"Commande inconnue. :p");
			break;
	}
	
    recursiveAsyncReadLine(); //Calling this function again to ask new question
  });
};

recursiveAsyncReadLine(); //we have to actually start our recursion somehow

////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////
// BOT DISCORD
////////////////////////////////////////////////////////////////
// require the needed discord.js classes
const { Client, Intents, MessageActionRow, MessageButton } = require('discord.js');

// create a new Discord client
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "DIRECT_MESSAGES"] });

////////////////////////////////////////////////////////////////
// Partie musique

const { Player } = require("discord-music-player");
const player = new Player(client, {
    leaveOnEmpty: false, // This options are optional.
});
// You can define the Player as *client.player* to easly access it.
client.player = player;

// Init the event listener only once (at the top of your code).
client.player
    // Emitted when channel was empty.
    .on('channelEmpty',  (queue) =>
        console.log(`Everyone left the Voice Channel, queue ended.`))
    // Emitted when a song was added to the queue.
    .on('songAdd',  (queue, song) =>
        console.log(`Song ${song} was added to the queue.`))
    // Emitted when a playlist was added to the queue.
    .on('playlistAdd',  (queue, playlist) =>
        console.log(`Playlist ${playlist} with ${playlist.songs.length} was added to the queue.`))
    // Emitted when there was no more music to play.
    .on('queueEnd',  (queue) =>
        console.log(`The queue has ended.`))
    // Emitted when a song changed.
    .on('songChanged', (queue, newSong, oldSong) =>
        console.log(`${newSong} is now playing.`))
    // Emitted when a first song in the queue started playing.
    .on('songFirst',  (queue, song) =>
        console.log(`Started playing ${song}.`))
    // Emitted when someone disconnected the bot from the channel.
    .on('clientDisconnect', (queue) =>
        console.log(`I was kicked from the Voice Channel, queue ended.`))
    // Emitted when deafenOnJoin is true and the bot was undeafened
    .on('clientUndeafen', (queue) =>
        console.log(`I got undefeanded.`))
    // Emitted when there was an error in runtime
    .on('error', (error, queue) => {
        console.log(`Error: ${error} in ${queue.guild.name}`);
    });

////////////////////////////////////////////////////////////////

client.on("ready", async function () {
	console.log('\n'+"/////////////////////".brightCyan);
  console.log("// Larbin de l'IUT //".brightCyan);
  console.log("////////////////////".brightCyan);
  console.log("");
  console.log("Bot démarré".brightGreen);
  
  checkAnniv();
});

// Commandes
client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()){
		console.log('['+'COMMANDE'.brightMagenta+'] '.brightWhite+interaction.user.username.brightBlue+' a lancé la commande '.brightWhite+interaction.commandName.yellow);
		if (interaction.commandName === 'ping') {
			await interaction.reply('Pong!');
		}

		if(interaction.commandName === 'setanniv'){
			// Je check si le membre a déjà enregistré sa date d'anniversaire
			let userAnniv = await memberSettings.findOne({
				where: {
					memberId: interaction.user.id,
					name: 'birthday'
				}
			});
			// S'il ne l'a pas déjà fait
			if(userAnniv == null){
				// On va checker que ce qu'il a envoyé est bien une date valide
				let memberBirthday = Date.parse(interaction.options.getString('date'));
				if(isNaN(memberBirthday)){
					console.log('\n'+'['+'ERREUR'.brightRed+"] Date illisible: "+interaction.options.getString('date'));
					await interaction.reply('J\'ai du mal à lire la date que tu m\'as donné. Est-elle bien dans ce format **MM/DD/YYYY**? :thinking:');
				}else{
					try {
						// A savoir que new Date utilise le format US -> il va comprendre MM/DD/YYYY
						memberBirthday = new Date(memberBirthday);
						console.log('['+'INSERT'.brightMagenta+'] '.brightWhite+interaction.user.username.brightBlue+" a renseigné sa date d'anniversaire. ".brightWhite+interaction.options.getString('date').yellow);
						var dd = memberBirthday.getDate();
						var mm = memberBirthday.getMonth() + 1;
				
						var yyyy = memberBirthday.getFullYear();
						if (dd < 10) {
							dd = '0' + dd;
						}
						if (mm < 10) {
							mm = '0' + mm;
						}
						let birthday = mm + '/' + dd + '/' + yyyy;
						let insetMemberBirthday = memberSettings.create({
							memberId: interaction.user.id,
							name: "birthday",
							value: birthday
						});
						await interaction.reply('Je m\'en souviendrai. :wink:');
						checkAnniv();
					} catch (error) {
						console.error('['+'ERREUR'.brightRed+'] Erreur lors de l\'insertion de la date d\'anniversaire: '.brightWhite+'\n', error);
						await interaction.reply("J'ai eu un petit problème pour enregistrer ta date d'anniversaire, re-essaie plus-tard. :p");
					}
				}
			}else{
				await interaction.reply('Tu ne peux pas redéfinir ta date d\'anniversaire. Demande au staff si besoin. :p');
			}
		}

		if(interaction.commandName === 'delanniv'){
			// On check les perms
			if(interaction.member.roles.cache.has(config.get("ROLE_ANNIV")) || interaction.member.id == config.get("ID_SOFIANE")){
				try {
					console.log('\n'+'['+'DELETE'.brightMagenta+"] Suppression de la date d'anniversaire de "+interaction.options.getMember('membre'));
					await memberSettings.destroy({
						where: {
							name: "birthday",
							memberId: interaction.options.getMember('membre').id
						}
					});
				} catch (error){
					console.error('['+'ERREUR'.brightRed+'] Erreur lors de la supression de la date d\'anniversaire: '.brightWhite+'\n', error);
					await interaction.reply("J'ai eu un petit problème pour supprimer la date d'anniversaire, re-essaie plus-tard. :p");
				}
				
				await interaction.reply('La date d\'anniversaire de <@'+interaction.options.getMember('membre')+'> a été supprimée.');
				checkAnniv();
			} else {
				await interaction.reply("Tu n'as pas le droit d'exécuter cette commande.");
			}
			
		}

		// Commandes pour le bot de musique
		let guildQueue = client.player.getQueue(interaction.guild.id);

		if (interaction.commandName === 'play') {
			await interaction.reply('Attend j\'appelle Jacqueline de la compta');
			let queue = client.player.createQueue(interaction.guild.id);
			await queue.join(interaction.member.voice.channel);
			let song = await queue.play( interaction.options.getString('titre') ).catch(async _ => {
				if(!guildQueue){
					queue.stop();
				}
			});
			await interaction.editReply("Lecture de **"+song+"**");
		}

		if (interaction.commandName === 'playlist') {
			let queue = client.player.createQueue(interaction.guild.id);
			await queue.join(interaction.member.voice.channel);
			let song = await queue.playlist( interaction.options.getString('titre') ).catch(_ => {
				if(!guildQueue)
					queue.stop();
			});
		}

		if (interaction.commandName === 'skip') {
			await interaction.reply('Musique skippée.');
			guildQueue.skip();
		}

		if (interaction.commandName === 'stop') {
			await interaction.reply('Musique arrêtée.');
			guildQueue.stop();
		}

		if (interaction.commandName === 'remove-loop') {
			await interaction.reply('Arrêt de la lecture en boucle.');
			guildQueue.setRepeatMode(RepeatMode.DISABLED); // or 0 instead of RepeatMode.DISABLED
		}

		if (interaction.commandName === 'toggle-loop') {
			await interaction.reply('Lecture en boucle '+RepeatMode.SONG);
			guildQueue.setRepeatMode(RepeatMode.SONG); // or 1 instead of RepeatMode.SONG
		}

		if (interaction.commandName === 'toggle-queue-loop') {
			await interaction.reply('Lecture en boucle de la file d\'attente: '+RepeatMode.QUEUE);
			guildQueue.setRepeatMode(RepeatMode.QUEUE); // or 2 instead of RepeatMode.QUEUE
		}

		if (interaction.commandName === 'setVolume') {
			await interaction.reply('Le volume a été réglé à '+interaction.options.getInteger('volume')+"%");
			guildQueue.setVolume(interaction.options.getInteger('volume'));
		}

		if (interaction.commandName === 'seek') {
			guildQueue.seek(parseInt(args[0]) * 1000);
		}

		if (interaction.commandName === 'clear-queue') {
			await interaction.reply('La liste de lecture a été vidée.');
			guildQueue.clearQueue();
		}

		if (interaction.commandName === 'shuffle') {
			await interaction.reply('La liste de lecture a été mélangée.');
			guildQueue.shuffle();
		}

		if (interaction.commandName === 'get-queue') {
			await interaction.reply("File d'attente: "+guildQueue);
		}

		if (interaction.commandName === 'get-volume') {
			await interaction.reply("Volume: "+guildQueue.volume+"%");
		}

		if (interaction.commandName === 'now-playing') {
			await interaction.reply(`Lecture en cours: ${guildQueue.nowPlaying}`);
		}

		if (interaction.commandName === 'pause') {
			await interaction.reply("La musique a été mise en pause.");
			guildQueue.setPaused(true);
		}

		if (interaction.commandName === 'resume') {
			await interaction.reply("Zéé repartiii!");
			guildQueue.setPaused(false);
		}

		if (interaction.commandName === 'remove') {
			await interaction.reply("La musique a été supprimée.");
			guildQueue.remove(parseInt(args[0]));
		}

		if (interaction.commandName === 'create-progress-bar') {
			const ProgressBar = guildQueue.createProgressBar();
			
			// [======>              ][00:35/2:20]
			await interaction.reply(ProgressBar.prettier);
		}
	}	
});

// Check anniversaire - WIP
async function checkAnniv() {
	console.log('['+'INFO'.yellow+'] Vérification des anniversaires.'.brightWhite);

	let today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth() + 1;

	var yyyy = today.getFullYear();
	if (dd < 10) {
		dd = '0' + dd;
	}
	if (mm < 10) {
		mm = '0' + mm;
	}
	today = mm + '/' + dd;

	let { count, rows } = await memberSettings.findAndCountAll({
		where: {
			name: "birthday",
			value:  {
				[Op.like]: today+'%'
			  }
		}
	});

	const guild = client.guilds.cache.get(config.get("GUILD_ID"));
	//console.log(guild);
	
	var membersWithAnnivRole = await guild.roles.cache.get(config.get("ROLE_ANNIV")).members;
	//console.log(membersWithAnnivRole);

	// On va vérifier que c'est bien l'anniv des membres ayant le rôle. :p
	for await (var memberWithAnnivRole of membersWithAnnivRole){
		
		var isMemberBirthday = false;
		for await (const member of rows){
			if(memberWithAnnivRole[0] === member.memberId.toString()){
				isMemberBirthday = true;
			}
		}
		if(!isMemberBirthday){
			console.log('['+'INFO'.yellow+'] Suppression du rôle anniversaire pour '.brightWhite+memberWithAnnivRole[1].user.username);
			memberWithAnnivRole[1].roles.remove(config.get("ROLE_ANNIV")).catch(console.error);
		}
	}
	console.log('['+'SUCCES'.brightGreen+'] C\'est l\'anniversaire de '+count+' personne(s).');
	
	for await (var member of rows){
		let memberFetch = await guild.members.fetch(member.memberId.toString());
		//console.log(memberFetch);
		if(memberFetch){	
			console.log(" 🎂 "+memberFetch.user.username);
			if(!memberFetch.roles.cache.has(config.get("ROLE_ANNIV"))){
				let annivRole= await memberFetch.guild.roles.cache.find(role => role.id === config.get("ROLE_ANNIV"));
				if(annivRole){
					memberFetch.roles.add(annivRole);
					console.log('['+'INFO'.yellow+'] Le rôle '.brightWhite + annivRole.name.yellow + "a été donné à " + memberFetch.user.username.brightBlue);

					// JE SUIS ICI, CETTE FONCTION NE FONCTONNE PAS
				}
				
			}
		}
	}

}


setInterval(checkAnniv, 21600000); // 6H

client.on('messageCreate', async message => {
	let messageDetails = {
		text: message.content,
		attachments: JSON.stringify(message.attachments),
	};
	let currentdate = new Date(message.createdTimestamp);
	/*
	let datetime = currentdate.getFullYear() + "-"
						+ (currentdate.getMonth()+1)	+ "-" 
						+ currentdate.getDate() + " "	
						+ (currentdate.getHours()+1) + ":"	
						+ currentdate.getMinutes() + ":" 
						+ currentdate.getSeconds();*/
	//let datetime = moment.unix(message.createdTimestamp).format("yyyy-MM-DD hh:mm:ss");
	let datetime = moment(message.createdAt, "yyyy-MM-DD hh:mm:ss");
	await discordMessages.create({
		messageId: message.id,
		channelId: message.channel.id,
		memberId: message.author.id,
		content: JSON.stringify(messageDetails),
		date: datetime,
	});
});

// login to Discord with your app's token
client.login(config.get("DISCORD_BOT_TOKEN"));