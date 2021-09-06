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
	description: '[Admin] Supprime la date d\'anniversaire d\'un membre.'
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

client.on("ready", async function () {
	console.log('\n'+"/////////////////////".brightCyan);
  console.log("// Larbin de l'IUT //".brightCyan);
  console.log("////////////////////".brightCyan);
  console.log("");
  console.log("Bot démarré".brightGreen);
});


client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()){
		console.log('['+'COMMANDE'.brightMagenta+'] '.brightWhite+interaction.user.username.brightBlue+' a lancé la commande '.brightWhite+interaction.commandName.yellow);
		if (interaction.commandName === 'ping') {
			await interaction.reply('Pong!');
		}else if(interaction.commandName === 'setanniv'){
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
					} catch (error) {
						console.error('['+'ERREUR'.brightRed+'] Erreur lors de l\'insertion de la date d\'anniversaire: '.brightWhite+'\n', error);
						await interaction.reply("J'ai eu un petit problème pour enregistrer ta date d'anniversaire, re-essaie plus-tard. :p");
					}
				}
			}else{
				await interaction.reply('Tu ne peux pas redéfinir ta date d\'anniversaire. Demande au staff si besoin. :p');
			}
		}else if(interaction.commandName === 'delanniv'){
			await interaction.reply('Je suis censé supprimer ta date d\'anniversaire?');
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
	console.log('['+'SUCCES'.brightGreen+'] C\'est l\'anniversaire de '+count+' personne(s).');
	for await (const member of rows){
		const guild = client.guilds.cache.get(config.get("GUILD_ID"));
		console.log(guild);
		let memberFetch = await guild.members.fetch(member.memberId.toString());
		console.log(memberFetch);
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

setInterval(checkAnniv, 5000);

// login to Discord with your app's token
client.login(config.get("DISCORD_BOT_TOKEN"));