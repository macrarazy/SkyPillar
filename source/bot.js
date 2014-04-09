/*
 * Created by CreaturePhil
 */

// Bot's Name
global.botName = 'Bot';

var joinAllRooms = true;
if (joinAllRooms === false) {
	// put rooms in the array that you want the bot to join
	var joinRooms = ['lobby'];
}

exports.bot = function() {

	// Set up fake user connection for bot. Uses a fake ip
  	var path = require("path"),
  				fs = require("fs");
	var worker = new (require(path.join(__dirname, '../', './fake-process')).FakeProcess)();
	Users.socketConnect(worker.server ,undefined, '1', '76.19.156.198');

	// Getting the fake user from the Users list
	for (var i in Users.users) { 
		if(Users.users[i].connections[0].ip === '76.19.156.198') {

			var bot = Users.users[i];

			// Modifying user's properties
			bot.name = botName;
			bot.named = true;
			bot.renamePending = botName;
			bot.authenticated = true;
			bot.userid = toUserid(botName);
			bot.group = '@';

			// Rooms that bot will join and adding bot user to Users list and
			// removing the fake user created which already filled its purpose
			// of easily filling in the gaps of all the user's property
			if (joinAllRooms === true) {
				for (var all in Rooms.rooms) {
					if (all != 'global' && all != 'spamroom') {
						bot.roomCount[all] = 1;
					}
				}
				Users.users[bot.userid] = bot;
				for (var allRoom in Rooms.rooms) {
					if (allRoom != 'global' && allRoom != 'spamroom') {
						Rooms.rooms[allRoom].users[Users.users[bot.userid]] = Users.users[bot.userid]; 
					}
				}
			} else {
				for (var index in joinRooms) {
					if (index != 'global' && index != 'spamroom') {
						bot.roomCount[joinRooms[index]] = 1;
					}
				}
				Users.users[bot.userid] = bot;
				for (var jIndex in joinRooms) {
					if (jIndex != 'global' && jIndex != 'spamroom') {
						Rooms.rooms[jIndex].users[Users.users[bot.userid]] = Users.users[bot.userid]; 
					}
				}
			}
			delete Users.users[i];
		}
	}
};

var botCommands = {
	penislength: function(target, room, user) {
		if (!this.canBroadcast()) return false;
		Utilities.botDelay(botName, room, '8.5 inches from the base. Perv.');
	},

	joke: (function () {
		var jokes = [
			"currently has no jokes",
			"no jokes sadly"
		];

		return function(target, room, user) {
			if (!this.canBroadcast()) return false;
			var message = jokes[Math.floor(Math.random() * jokes.length)];
			if (!this.canTalk(message)) return false;

			Utilities.botDelay(botName, room, sanitize(message));
		};
	})(),

	ask: function(target, room, user) {
		if (!this.canBroadcast()) return false;
		switch(target.toLowerCase()) {
			case 'what do you think of mods?': Utilities.botDelay(botName, room, '┌∩┐༼ ºل͟º ༽┌∩┐FUCK DA MODS ┌∩┐༼ ºل͟º ༽┌∩┐'); break;
			case 'but you are a mod tho?': Utilities.botDelay(botName, room, 'yeah i hate myself T_T'); break;
			case 'you suck': Utilities.botDelay(botName, room, (user.name+', why are you so mean to me? :(')); break;
			case 'you suck!': Utilities.botDelay(botName, room, (user.name+', why are you so mean to me? :(')); break;
			case 'what is the color of the sky?': Utilities.botDelay(botName, room, (user.name+', just google it: http://tinyurl.com/la8pdrk')); break;
			default: Utilities.botDelay(botName, room, 'Sorry, I don\'t know what you are trying to ask.');
		}
	},

	riot: function(target, room, user) {
		if (!this.canBroadcast()) return false;
		Utilities.botDelay(botName, room, 'ヽ༼ຈل͜ຈ༽ﾉ RIOT or RIOT ヽ༼ຈل͜ຈ༽ﾉ');
	},

	atm: function(target, room, user) {
		if (!this.canBroadcast()) return false;
		Utilities.botDelay(botName, room, (user.name+', use **/profile** instead.'));
	},
};

global.botcmds = [];
for(var i in botCommands) {
	botcmds.push(i);
}
Object.merge(CommandParser.commands, botCommands);
exports.botCommands = botCommands;
