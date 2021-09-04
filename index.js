const { Client, Intents } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

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
				console.log('\n'+"Tu n'as pas mis d'arguments :p"+'\n'+"Usage: say <Numéro du canal> <Texte>");
			else {
				var message = args[1].substring(1, args[1].length-1);
				client.channels.cache.get(args[0]).send(message);
				console.log('\n'+"Le message a été envoyé dans le canal n°"+args[0]);
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

// FIN DE LA CONSOLE

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.login('ODc1NzYzNDEyOTUxNTIzMzU4.YRaQPA.bZwAvf1Hdccuhi17ROytwGM1qI0');