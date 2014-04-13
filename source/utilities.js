/*
 * Utilities.js
 *
 * This is where extraneous and important functions are stored.
 * In addition to globals.
 *
 */

 var Utilities = exports.Utilities = {
    
	HueToRgb: function (m1, m2, hue) {
	    var v;
	    if (hue < 0)
	        hue += 1;
	    else if (hue > 1)
	        hue -= 1;

	    if (6 * hue < 1)
	        v = m1 + (m2 - m1) * hue * 6;
	    else if (2 * hue < 1)
	        v = m2;
	    else if (3 * hue < 2)
	        v = m1 + (m2 - m1) * (2 / 3 - hue) * 6;
	    else
	        v = m1;

	    return (255 * v).toString(16);
	},

	hashColor: function (name) {
	    var crypto = require('crypto');
	    var hash = crypto.createHash('md5').update(name).digest('hex');
	    var H = parseInt(hash.substr(4, 4), 16) % 360;
	    var S = parseInt(hash.substr(0, 4), 16) % 50 + 50;
	    var L = parseInt(hash.substr(8, 4), 16) % 20 + 25;

	    var m1, m2, hue;
	    var r, g, b
	        S /= 100;
	    L /= 100;
	    if (S == 0)
	        r = g = b = (L * 255).toString(16);
	    else {
	        if (L <= 0.5)
	            m2 = L * (S + 1);
	        else
	            m2 = L + S - L * S;
	        m1 = L * 2 - m2;
	        hue = H / 360;
	        r = this.HueToRgb(m1, m2, hue + 1 / 3);
	        g = this.HueToRgb(m1, m2, hue);
	        b = this.HueToRgb(m1, m2, hue - 1 / 3);
	    }

	    return 'rgb(' + r + ', ' + g + ', ' + b + ');';
	},

	formatAMPM: function(date) {
		var hours = date.getHours();
		var minutes = date.getMinutes();
		var ampm = hours >= 12 ? 'PM' : 'AM';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0'+minutes : minutes;
		var strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	},

	rank: function(user){
		var data = fs.readFileSync('config/db/tourWins.csv','utf8');
		var row = (''+data).split("\n");

		var list = [];

		for (var i = row.length; i > -1; i--) {
			if (!row[i]) continue;
			var parts = row[i].split(",");
			list.push([toUserid(parts[0]),Number(parts[1])]);
		}
		list.sort(function(a,b){
    		return a[1] - b[1];
		});
		var arr = list.filter( function( el ) {
   			 return !!~el.indexOf(toUserid(user));
		});
		if (list.indexOf(arr[0]) === -1) {
			return 'Not Ranked';
		} else {
			return 'Rank <b>' + (list.length-list.indexOf(arr[0])) + '</b> out of ' + list.length;
		}
	},

	calcElo: function(winner, loser) {
		var kFactor = 32;
  		var ratingDifference = loser.elo - winner.elo;
  		var expectedScoreWinner = 1 / ( 1 + Math.pow(10, ratingDifference/400) );

  		var e = kFactor * (1 - expectedScoreWinner);
 		winner.elo = winner.elo + e;
  		loser.elo = loser.elo - e;

  		var arr = [winner.elo, loser.elo];
  		return arr;
	},

	botDelay: function(botName, room, message) {
		setTimeout(function(){
			room.add('|c|' + Users.users[toUserid(botName)].group + botName + '|' + message);
		}, (Math.floor(Math.random() * 6) * 1000));
	},

	spamProtection: function(user, room, connection, message) {
		if (user.group === ' ') { 

			// flooding check
			/*if (user.numMsg >= 5 && user.group === ' ') {
				room.add('|c|'+ user.name+'|'+message);
				user.popup(botName+' has muted you for 7 minutes. '+ '(spam)');
				room.add(''+user.name+' was muted by '+ botName +' for 7 minutes.' + ' (flooding)');
				var alts = user.getAlts();
				if (alts.length) room.add(""+user.name+"'s alts were also muted: "+alts.join(", "));
				room.add('|unlink|' + user.userid);

				user.mute(room.id, 7*60*1000);
				user.numMsg = 0;
				return false;
			}*/

			// numMsgs reset 
			if (user.connected === false) {
				user.numMsg = 0;
				user.warnCounter = 0;
			}
			if (user.numMsg != 0){
				setTimeout(function() {
					user.numMsg = 0;
				}, 6000);
			}

			// caps check
			var capsMatch = message.replace(/[^A-Za-z]/g, '').match(/[A-Z]/g);
			if (capsMatch && this.toId(message).length > 18 && (capsMatch.length >= Math.floor(this.toId(message).length * 0.8))) {
				room.add('|c|'+ user.name+'|'+message);
						user.warnCounter++;
						if (user.warnCounter >= 3) {
							user.popup(botName+' has muted you for 7 minutes. (caps)');
							room.add(''+user.name+' was muted by '+botName+' for 7 minutes.' + ' (caps)');
							var alts = user.getAlts();
							if (alts.length) room.add(""+user.name+"'s alts were also muted: "+alts.join(", "));
							room.add('|unlink|' + user.userid);

							user.numMsg = 0;
							user.warnCounter = 0;
							user.mute(room.id, 7*60*1000);
							return false;
						}
						room.add(''+user.name+' was warned by '+botName+'.' +  ' (caps)');
						user.send('|c|~|/warn '+'caps');
						return false;

			}

			// stretch check
			var stretchMatch = message.toLowerCase().match(/(.)\1{7,}/g); // matches the same character 8 or more times in a row
			if (stretchMatch) {
				room.add('|c|'+ user.name+'|'+message);
				user.warnCounter++;
				if (user.warnCounter >= 3) {
					user.popup(botName+' has muted you for 7 minutes. (stretching)');
					room.add(''+user.name+' was muted by '+ botName +' for 7 minutes.' + ' (stretching)');
					var alts = user.getAlts();
					if (alts.length) room.add(""+user.name+"'s alts were also muted: "+alts.join(", "));
					room.add('|unlink|' + user.userid);

					user.numMsg = 0;
					user.warnCounter = 0;
					user.mute(room.id, 7*60*1000);
					return false;
				}
				room.add(''+user.name+' was warned by '+botName+'.' +  ' (stretching)');
				user.send('|c|~|/warn '+'stretching');
				return false;
			}

			/*var banWords = ['fuck','bitch','nigga','fag','shit','nigger'];
			for (var i=0;i<banWords.length;i++) {
				if (message.toLowerCase().indexOf(banWords[i]) >= 0) {
					room.add('|c|'+ user.name+'|'+message);
					if (user.warnCounter >= 3) {
						user.popup(botName+' has muted you for 7 minutes. (Inappropriate word: ' + banWords[i]+')');
						room.add(''+user.name+' was muted by '+ botName +' for 7 minutes. (Inappropriate word: ' + banWords[i]+')');
						var alts = user.getAlts();
						if (alts.length) room.add(""+user.name+"'s alts were also muted: "+alts.join(", "));
						room.add('|unlink|' + user.userid);

						user.numMsg = 0;
						user.warnCounter = 0;
						user.mute(room.id, 7*60*1000);
						return false;
					}
					var botMsg = user.name + ' -> Go ahead, make my day. [Inappropriate word: '+banWords[i]+'] [warning]';
					this.botDelay(botName, room, botMsg);
					user.warnCounter++;
					return false;
				}
			}*/

		}

	},

	toId: function(text) {
		return text.toLowerCase().replace(/[^a-z0-9]/g, '');
	}

};

// Global Variables

// Shortcut for using Object.keys
global.k = function(o) {
	return Object.keys(o);
}