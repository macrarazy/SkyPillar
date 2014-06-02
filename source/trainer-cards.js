/**
 * Trainer Cards
 *
 * This is where the trainer cards commands
 * are located.
 *
 */

var trainerCards = {

	judge: 'judgmental',
	elitefourjudge: 'judgmental',
	judgmental: function (target, room, user) {
	    if (!this.canBroadcast()) return;
	    this.sendReplyBox('<center><img src="http://i.imgur.com/uPqFgYD.png"><br><font color="blue"><blink>Ace: Lapras</blink><br><font color="green">Stay Tuned!');
	},
	
	nicky: 'rivalnick',
	rival: 'rivalnick',
	rivalnick: function (target, room, user) {
	    if (!this.canBroadcast()) return;
	    this.sendReplyBox('<center><img src="http://i.imgur.com/BfZwabS.jpg"><br><font color="blue"><blink>Champion Of Hoenn</blink><br><font color="black">Programmer: HTML5,CSS,JavaScript,Java & Ruby');
	},
	sorryfor: 'sorryforyourloss',
	yourloss: 'sorryforyourloss',
	sorryforyourloss: function (target,room, user) {
		if (!this.canBroadcast()) return;
		this.sendReplyBox('<center><img src="http://i.imgur.com/W0oMHIu.png"><br><font color="green"><blink>"There is an island where rivers run deep, where the sea sparkling in the sun earns it the name Jewel of the Antilles."</blink><br><font color="black">Artist, Mathematician');
	},
	cata:'catacomb',
	comb:'catacomb',
	catacomb: function (target, room, user) {
	if (!this.canBroadcast()) return;
	this.sendReplyBox('<center><img src="http://upload.wikimedia.org/wikipedia/en/4/49/Skull_of_Alexander_Pearce.jpg"><br><font color="black"><blink>The Narcissitic Bookworm</blink><br><font color="purple">Murderous, Reddit Manager, And its SAL ASHIE NOT MENCE!');
	},
	winee:'Wıne',
	wine:'Wıne',
	wine: function (target, room, user) {
	if (!this.canBroadcast()) return;
	this.sendReplyBox('<center><img src="http://i.imgur.com/NoRiXGk.jpg"><br><font color="brown"><blink>Lord Sableye</blink><br><font color="black">I am childish and weird');
	},
	the:'themeh',
     	meh:'themeh',
     	themeh: function (target, room, user) {
     	if (!this.canBroadcast()) return;
     	this.sendReplyBox('<center><img src="http://i.imgur.com/XqM7grb.jpg"><br><font color="red"><blink>"There is a beast in man that should be exercised, not exorcised.” - Anton LaVey');
     	},
	dataoverload:'(data_overload)',
	overload:'(data_overload)',
	data_overload: function (target, room, user) {
	if (!this.canBroadcast()) return;
	this.sendReplyBox('<center><img src="http://img1.wikia.nocookie.net/__cb20140220182107/pokemon/images/thumb/3/37/376Metagross_Ranger_3.jpg/185px-376Metagross_Ranger_3.jpg"><br><font color="black"><blink>Data_Overload</blink><br><font color="blue">Work it Harder, Make it Better, Do it Faster, Makes us Stronger');
	},
	ashie: 'ashiemore',
	ashiemore: function (target, room, user) {
	    if (!this.canBroadcast()) return;
	    this.sendReplyBox('<center>Working on one :P');
	},
};

Object.merge(CommandParser.commands, trainerCards);
exports.trainerCards = trainerCards;
