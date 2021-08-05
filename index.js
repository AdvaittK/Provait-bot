const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require("fs");
const config = require('./config.json');
const BOT_TOKEN = config.BOT_TOKEN;
const PREFIX = config.PREFIX;
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
let PlayerCount = require('./server/players');

const setup = require('./setup.js');
const { start } = require('./bot.js');

const printValues = function(values,text) {
  console.log(text ? text : 'Current values:');
  for (var key in values) {
    console.log(`  ${key} = \x1b[32m'${values[key]}'\x1b[0m`);
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
    
    setInterval(() => {
      PlayerCount.getPlayerCount().then((result) => {
          client.user.setActivity(`with ${result.data.length} players`,{ type: 'PLAYING' });
      })
    }, 10000);
});

client.login(BOT_TOKEN);

for(const file of commandFiles){
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on('message', message =>{
  if(!message.content.startsWith(PREFIX) || message.author.bot) return
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if(!client.commands.has(command)) return
  try {
    client.commands.get(command).execute(message, args);
  } catch (error) {
    console.error(error);
  }
});

const startBot = function(values) {
  console.log('Starting bot');
  var bot = start(values);
  bot.on('restart',() => {
    console.log('\nRestarting bot');
    bot.destroy();
    bot = start(values);
  })
  var shutdown = function() {
    console.log('Shutting down');
    let destructor = bot.destroy();
    if (destructor) {
      destructor.then(() => {
        process.exit(0);
      }).catch(console.error);
    } else {
      process.exit(0);
    }
  }
  process.on('SIGINT',shutdown);
  process.on('SIGTERM',shutdown);
}

if (process.argv.includes('-c') || process.argv.includes('--config')) {
  setup.loadValues().then((values) => {
    printValues(values);
    process.exit(0);
  }).catch((error) => {
    console.log('Unable to load saved values, configuring all again');
    setup.createValues().then((values) => {
      setup.saveValues(values).then(() => {
        printValues(values,'New values:');
        process.exit(0);
      }).catch(console.error);
    }).catch(console.error);
  })
} else {
  console.log('Attempting to load enviroment');
  setup.loadValues().then((values) => {
    startBot(values);
  }).catch((error) => {
    console.error(error);
    setup.createValues().then((values) => {
      setup.saveValues(values).then(() => {
        startBot(values);
      }).catch(console.error);
    }).catch(console.error);
  })
}
