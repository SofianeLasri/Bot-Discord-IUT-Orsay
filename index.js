// Configuration
const config = require('./config');
// Driver SQL
const Sequelize = require('sequelize');
// API externe
const express = require('express')
const app = express()
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
	description: 'Permet de définir ta date d\'anniversaire (usage unique).'
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

		let token = await botSettings.findOne({where: {name: "token" }});
		if(token == null){
			console.log('['+'INSERT'.brightMagenta+'] Insertion de token'.brightWhite);
			let token = botSettings.create({
				name: "token",
				value: config.get("DISCORD_BOT_TOKEN")
			});
		}else{
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
			let userAnniv = await memberSettings.findOne({where: {memberId: interaction.user.id name: "birthday"}});
			if(userAnniv == null){
				await interaction.reply('Je ne connais pas ta date d\'anniversaire.');
			}else{
				await interaction.reply('Je connais ta date d\'anniversaire!');
			}
		}else if(interaction.commandName === 'delanniv'){
			await interaction.reply('Je suis censé supprimer ta date d\'anniversaire?');
		}
	}	
});

// login to Discord with your app's token
client.login(config.get("DISCORD_BOT_TOKEN"));