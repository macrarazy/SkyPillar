/**
 * System commands
 * Pokemon Showdown - http://pokemonshowdown.com/
 *
 * These are system commands - commands required for Pokemon Showdown
 * to run. A lot of these are sent by the client.
 *
 * If you'd like to modify commands, please go to config/commands.js,
 * which also teaches you how to use commands.
 *
 * @license MIT license
 */
var crypto = require('crypto');
var fs = require('fs');
var modlog = exports.modlog = {lobby: fs.createWriteStream('logs/modlog.txt', {flags:'a+'}), battle: fs.createWriteStream('logs/modlog/modlog_battle.txt', {flags:'a+'})};
var avatars = fs.createWriteStream('config/avatars.txt', {'flags': 'a'});
var complaint = exports.complaint = complaint || fs.createWriteStream('logs/complaint.txt', {flags:'a+'});
 
const MAX_REASON_LENGTH = 300;
 
var commands = exports.commands = {
 
        version: function (target, room, user) {
                if (!this.canBroadcast()) return;
                this.sendReplyBox("Server version: <b>" + CommandParser.package.version + "</b>");
        },
 
        me: function (target, room, user, connection) {
                // By default, /me allows a blank message
                if (target) target = this.canTalk(target);
                if (!target) return;
 
                return '/me ' + target;
        },
 
        mee: function (target, room, user, connection) {
                // By default, /mee allows a blank message
                if (target) target = this.canTalk(target);
                if (!target) return;
 
                return '/mee ' + target;
        },
 
        avatar: function (target, room, user) {
                if (!target) return this.parse('/avatars');
                var parts = target.split(',');
                var avatar = parseInt(parts[0]);
                if (!avatar || avatar > 294 || avatar < 1) {
                        if (!parts[1]) {
                                this.sendReply("Invalid avatar.");
                        }
                        return false;
                }
 
                user.avatar = avatar;
                if (!parts[1]) {
                        this.sendReply("Avatar changed to:\n" +
                                '|raw|<img src="//play.pokemonshowdown.com/sprites/trainers/' + avatar + '.png" alt="" width="80" height="80" />');
                }
        },
 
        logout: function (target, room, user) {
                user.resetName();
        },
 
        r: 'reply',
        reply: function (target, room, user) {
                if (!target) return this.parse('/help reply');
                if (!user.lastPM) {
                        return this.sendReply("No one has PMed you yet.");
                }
                return this.parse('/msg ' + (user.lastPM || '') + ', ' + target);
        },
 
pm: 'msg',
        whisper: 'msg',
        w: 'msg',
        msg: function (target, room, user) {
                if (!target) return this.parse('/help msg');
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!target) {
                        this.sendReply("You forgot the comma.");
                        return this.parse('/help msg');
                }
                if (!targetUser || !targetUser.connected) {
                        if (targetUser && !targetUser.connected) {
                                this.popupReply("User " + this.targetUsername + " is offline.");
                        } else if (!target) {
                                this.popupReply("User " + this.targetUsername + " not found. Did you forget a comma?");
                        } else {
                                this.popupReply("User "  + this.targetUsername + " not found. Did you misspell their name?");
                        }
                        return this.parse('/help msg');
                }
 
                if (Config.pmmodchat) {
                        var userGroup = user.group;
                        if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
                                var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
                                this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to PM users.");
                                return false;
                        }
                }
 
                if (user.locked && !targetUser.can('lock', user)) {
                        return this.popupReply("You can only private message members of the moderation team (users marked by %, @, &, or ~) when locked.");
                }
                if (targetUser.locked && !user.can('lock', targetUser)) {
                        return this.popupReply("This user is locked and cannot PM.");
                }
                if (targetUser.ignorePMs && !user.can('lock')) {
                        if (!targetUser.can('lock')) {
                                return this.popupReply("This user is blocking Private Messages right now.");
                        } else if (targetUser.can('hotpatch')) {
                                return this.popupReply("This admin is too busy to answer Private Messages right now. Please contact a different staff member.");
                        }
                }
 
                target = this.canTalk(target, null);
                if (!target) return false;
 
                var message = '|pm|' + user.getIdentity() + '|' + targetUser.getIdentity() + '|' + target;
                user.send(message);
                if (targetUser !== user) targetUser.send(message);
                targetUser.lastPM = user.userid;
                user.lastPM = targetUser.userid;
        },
        blockpm: 'ignorepms',
        blockpms: 'ignorepms',
        ignorepm: 'ignorepms',
        ignorepms: function (target, room, user) {
                if (user.ignorePMs) return this.sendReply("You are already blocking Private Messages!");
                if (user.can('lock') && !user.can('hotpatch')) return this.sendReply("You are not allowed to block Private Messages.");
                user.ignorePMs = true;
                return this.sendReply("You are now blocking Private Messages.");
        },
 
        unblockpm: 'unignorepms',
        unblockpms: 'unignorepms',
        unignorepm: 'unignorepms',
        unignorepms: function (target, room, user) {
                if (!user.ignorePMs) return this.sendReply("You are not blocking Private Messages!");
                user.ignorePMs = false;
                return this.sendReply("You are no longer blocking Private Messages.");
        },
 
        makechatroom: function (target, room, user) {
                if (!this.can('makeroom')) return;
                var id = toId(target);
                if (!id) return this.parse('/help makechatroom');
                if (Rooms.rooms[id]) return this.sendReply("The room '" + target + "' already exists.");
                if (Rooms.global.addChatRoom(target)) {
                        return this.sendReply("The room '" + target + "' was created.");
                }
                return this.sendReply("An error occurred while trying to create the room '" + target + "'.");
        },
 
        deregisterchatroom: function (target, room, user) {
                if (!this.can('makeroom')) return;
                var id = toId(target);
                if (!id) return this.parse('/help deregisterchatroom');
                var targetRoom = Rooms.get(id);
                if (!targetRoom) return this.sendReply("The room '" + target + "' doesn't exist.");
                target = targetRoom.title || targetRoom.id;
                if (Rooms.global.deregisterChatRoom(id)) {
                        this.sendReply("The room '" + target + "' was deregistered.");
                        this.sendReply("It will be deleted as of the next server restart.");
                        return;
                }
                return this.sendReply("The room '" + target + "' isn't registered.");
        },
 
        privateroom: function (target, room, user) {
                if (!this.can('privateroom', null, room)) return;
                if (target === 'off') {
                        delete room.isPrivate;
                        this.addModCommand("" + user.name + " made this room public.");
                        if (room.chatRoomData) {
                                delete room.chatRoomData.isPrivate;
                                Rooms.global.writeChatRoomData();
                        }
                } else {
                        room.isPrivate = true;
                        this.addModCommand("" + user.name + " made this room private.");
                        if (room.chatRoomData) {
                                room.chatRoomData.isPrivate = true;
                                Rooms.global.writeChatRoomData();
                        }
                }
        },
       
 
        modjoin: function (target, room, user) {
                if (!this.can('privateroom', null, room)) return;
                if (target === 'off') {
                        delete room.modjoin;
                        this.addModCommand("" + user.name + " turned off modjoin.");
                        if (room.chatRoomData) {
                                delete room.chatRoomData.modjoin;
                                Rooms.global.writeChatRoomData();
                        }
                } else {
                        room.modjoin = true;
                        this.addModCommand("" + user.name + " turned on modjoin.");
                        if (room.chatRoomData) {
                                room.chatRoomData.modjoin = true;
                                Rooms.global.writeChatRoomData();
                        }
                }
        },
        interversalroom: function(target, room, user) {
                if (!this.can('makeroom')) return;
                if (!room.chatRoomData) {
                        return this.sendReply('/internersalroom - This room can\'t be marked as a league');
                }
                if (target === 'off') {
                        delete room.isInterversal;
                        this.addModCommand(user.name+' has made this chat room a normal room.');
                        delete room.chatRoomData.isInterversal;
                        Rooms.global.writeChatRoomData();
                } else {
                        room.isInterversal = true;
                        this.addModCommand(user.name+' made this room a InterVersal room.');
                        room.chatRoomData.isInterversal = true;
                        Rooms.global.writeChatRoomData();
                }
        },
 
        officialchatroom: 'officialroom',
        officialroom: function (target, room, user) {
                if (!this.can('makeroom')) return;
                if (!room.chatRoomData) {
                        return this.sendReply("/officialroom - This room can't be made official");
                }
                if (target === 'off') {
                        delete room.isOfficial;
                        this.addModCommand("" + user.name + " made this chat room unofficial.");
                        delete room.chatRoomData.isOfficial;
                        Rooms.global.writeChatRoomData();
                } else {
                        room.isOfficial = true;
                        this.addModCommand("" + user.name + " made this chat room official.");
                        room.chatRoomData.isOfficial = true;
                        Rooms.global.writeChatRoomData();
                }
        },
 
        roommanager: function(target, room, user) {
                if (!room.chatRoomData) {
                        return this.sendReply("/roommanager - This room is't designed for per-room moderation to be added.");
                }
                var target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                if (!targetUser) return this.sendReply("User '"+this.targetUsername+"' is not online.");
                if (!this.can('makeroom')) return false;
                if (!room.auth) room.auth = room.chatRoomData.auth = {};
                var name = targetUser.name;
                room.auth[targetUser.userid] = '#';
                room.manager = targetUser.userid;
                this.addModCommand(''+name+' was appointed to Room Manager by '+user.name+'.');
                room.onUpdateIdentity(targetUser);
                room.chatRoomData.manager = room.manager;
                Rooms.global.writeChatRoomData();
        },
 
        roomowner: function(target, room, user) {
                if (!room.chatRoomData) {
                        return this.sendReply("/roomowner - This room isn't designed for per-room moderation to be added");
                }
                var target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
 
                if (!targetUser) return this.sendReply("User '"+this.targetUsername+"' is not online.");
 
                if (!room.manager) return this.sendReply('The room needs a room manager before it can have a room owner.');
                if (room.manager != user.userid && !this.can('makeroom')) return this.sendReply('/roomowner - Access denied.');
 
                if (!room.auth) room.auth = room.chatRoomData.auth = {};
 
                var name = targetUser.name;
 
                room.auth[targetUser.userid] = '#';
                this.addModCommand(''+name+' was appointed Room Owner by '+user.name+'.');
                room.onUpdateIdentity(targetUser);
                Rooms.global.writeChatRoomData();
        },
 
        roomdeowner: 'deroomowner',
        deroomowner: function(target, room, user) {
                if (!room.auth) {
                        return this.sendReply("/roomdeowner - This room isn't designed for per-room moderation");
                }
                var target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                var name = this.targetUsername;
                var userid = toId(name);
                if (!userid || userid === '') return this.sendReply("User '"+name+"' does not exist.");
 
                if (room.auth[userid] !== '#') return this.sendReply("User '"+name+"' is not a room owner.");
                if (!room.manager || user.userid != room.manager && !this.can('makeroom')) return false;
 
                delete room.auth[userid];
                this.sendReply('('+name+' is no longer Room Owner.)');
                if (targetUser) targetUser.updateIdentity();
                if (room.chatRoomData) {
                        Rooms.global.writeChatRoomData();
                }
        },
       
        roomadmin: function(target, room, user) {
                if (!room.chatRoomData) {
                        return this.sendReply("/roomadmin - This room isn't designed for per-room moderation to be added");
                }
                var target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
 
                if (!targetUser) return this.sendReply("User '"+this.targetUsername+"' is not online.");
 
                if (!this.can('makeroom', targetUser, room)) return false;
 
                if (!room.auth) room.auth = room.chatRoomData.auth = {};
 
                var name = targetUser.name;
 
                room.auth[targetUser.userid] = '~';
                this.addModCommand(''+name+' was appointed Room Administrator by '+user.name+'.');
                room.onUpdateIdentity(targetUser);
                Rooms.global.writeChatRoomData();
        },
        roomdeadmin: 'deroomadmin',
        deroomadmin: function(target, room, user) {
                if (!room.auth) {
                        return this.sendReply("/roomdeadmin - This room isn't designed for per-room moderation");
                }
                var target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                var name = this.targetUsername;
                var userid = toId(name);
                if (!userid || userid === '') return this.sendReply("User '"+name+"' does not exist.");
 
                if (room.auth[userid] !== '~') return this.sendReply("User '"+name+"' is not a room admin.");
                if (!this.can('makeroom', null, room)) return false;
 
                delete room.auth[userid];
                this.sendReply('('+name+' is no longer Room Administrator.)');
                if (targetUser) targetUser.updateIdentity();
                if (room.chatRoomData) {
                        Rooms.global.writeChatRoomData();
                }
        },
       
        roomdesc: function (target, room, user) {
                if (!target) {
                        if (!this.canBroadcast()) return;
                        var re = /(https?:\/\/(([-\w\.]+)+(:\d+)?(\/([\w/_\.]*(\?\S+)?)?)?))/g;
                        if (!room.desc) return this.sendReply("This room does not have a description set.");
                        this.sendReplyBox("The room description is: " + room.desc.replace(re, '<a href="$1">$1</a>'));
                        return;
                }
                if (!this.can('roommod', null, room)) return false;
                if (target.length > 80) return this.sendReply("Error: Room description is too long (must be at most 80 characters).");
 
                room.desc = target;
                this.sendReply("(The room description is now: " + target + ")");
 
                if (room.chatRoomData) {
                        room.chatRoomData.desc = room.desc;
                        Rooms.global.writeChatRoomData();
                }
        },
 
        roomdemote: 'roompromote',
        roompromote: function (target, room, user, connection, cmd) {
                if (!room.auth) {
                        this.sendReply("/roompromote - This room isn't designed for per-room moderation");
                        return this.sendReply("Before setting room mods, you need to set it up with /roomowner");
                }
                if (!target) return this.parse('/help roompromote');
 
                target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                var userid = toId(this.targetUsername);
                var name = targetUser ? targetUser.name : this.targetUsername;
 
                if (!userid) return this.parse('/help roompromote');
                if (!targetUser && (!room.auth || !room.auth[userid])) {
                        return this.sendReply("User '" + name + "' is offline and unauthed, and so can't be promoted.");
                }
 
                var currentGroup = ((room.auth && room.auth[userid]) || ' ')[0];
                var nextGroup = target || Users.getNextGroupSymbol(currentGroup, cmd === 'roomdemote', true);
                if (target === 'deauth') nextGroup = Config.groupsranking[0];
                if (!Config.groups[nextGroup]) {
                        return this.sendReply("Group '" + nextGroup + "' does not exist.");
                }
 
                if (Config.groups[nextGroup].globalonly) {
                        return this.sendReply("Group 'room" + Config.groups[nextGroup].id + "' does not exist as a room rank.");
                }
 
                var groupName = Config.groups[nextGroup].name || "regular user";
                if (currentGroup === nextGroup) {
                        return this.sendReply("User '" + name + "' is already a " + groupName + " in this room.");
                }
                if (currentGroup !== ' ' && !user.can('room' + Config.groups[currentGroup].id, null, room)) {
                        return this.sendReply("/" + cmd + " - Access denied for promoting from " + Config.groups[currentGroup].name + ".");
                }
                if (nextGroup !== ' ' && !user.can('room' + Config.groups[nextGroup].id, null, room)) {
                        return this.sendReply("/" + cmd + " - Access denied for promoting to " + Config.groups[nextGroup].name + ".");
                }
 
                if (nextGroup === ' ') {
                        delete room.auth[userid];
                } else {
                        room.auth[userid] = nextGroup;
                }
 
                if (Config.groups[nextGroup].rank < Config.groups[currentGroup].rank) {
                        this.privateModCommand("(" + name + " was demoted to Room " + groupName + " by " + user.name + ".)");
                        if (targetUser) targetUser.popup("You were demoted to Room " + groupName + " by " + user.name + ".");
                } else if (nextGroup === '#') {
                        this.addModCommand("" + name + " was promoted to " + groupName + " by " + user.name + ".");
                } else {
                        this.addModCommand("" + name + " was promoted to Room " + groupName + " by " + user.name + ".");
                }
 
                if (targetUser) targetUser.updateIdentity();
                if (room.chatRoomData) Rooms.global.writeChatRoomData();
        },
 
        autojoin: function (target, room, user, connection) {
                Rooms.global.autojoinRooms(user, connection);
        },
 
        join: function(target, room, user, connection) {
                if (!target) return false;
                var targetRoom = Rooms.get(target) || Rooms.get(toId(target));
                if (!targetRoom) {
                        if (target === 'lobby') return connection.sendTo(target, "|noinit|nonexistent|");
                        return connection.sendTo(target, "|noinit|nonexistent|The room '"+target+"' does not exist.");
                }
                if (targetRoom.isPrivate && !user.named) {
                        return connection.sendTo(target, "|noinit|namerequired|You must have a name in order to join the room '"+target+"'.");
                }
                if (!user.joinRoom(targetRoom || room, connection)) {
                        return connection.sendTo(target, "|noinit|joinfailed|The room '"+target+"' could not be joined.");
                }
                if (target.toLowerCase() == "lobby") {
                        return connection.sendTo('lobby','|html|<div class = "welcomemssage"><center><img src=http://i.imgur.com/but1Bih.jpg?1><br>' +
                        '<b><p>Welcome to Skypillar!</b><br><br><p>Welcome to the Hoenn Regions very own server! Skypillar has many things to offer in terms of plugins such as the Shop, our Elite Four League and many more!<br>If any problems occur feel free to PM a Driver (%) or Moderator (@), but only PM upper staff Leaders (&) and Admins (~) for special concerns. Enjoy yourself here!' +
                        '<center><a href = "http://skypillar.boards.net/"><button class="blackbutton title="Boards><font color="Blue"><b>Boards</b></a></button> | <a href ="http://www.reddit.com/r/skypillar"><button class="blackbutton title="Reddit"><font color="greem"><b>Skypillar Reddit</b></a></button>');
                }
               if (target.toLowerCase() == "sports") {
                        return connection.sendTo('sports', '|html|<div class = "infobox"><center><img src="http://i.imgur.com/bUdvQbF.gif"><center><br />' +
                        '<center><b><u>Welcome to the Sports Room!</u></b></center><br />'+
                        'The place to discuss sports with like minded people and friends.  If you have any questions feel free to PM some of the staff (The people with the ~, &, #, @, and % next to their name) here on Universal!  Any spammers will not be tolerated here and will be promptly muted according to rules.  But most importantly, Have fun!'+                        
                        '<center>Go UConn!</center><br /><br />' +
                        '</div>');
                }
 
        },
        rk: 'roomkick',
        rkick: 'roomkick',
        kick: 'roomkick',
        roomkick: function(target, room, user){
                if (!room.auth && room.id !== "staff") return this.sendReply('/rkick is designed for rooms with their own auth.');
                if (!this.can('roommod', null, room)) return false;
                if (!target) return this.sendReply('/rkick [username] - kicks the user from the room. Requires: @ & ~');
                var targetUser = Users.get(target);
                if (!targetUser) return this.sendReply('User '+target+' not found.');
                if (!Rooms.rooms[room.id].users[targetUser.userid]) return this.sendReply(target+' is not in this room.');
                if (targetUser.universalDev) return this.sendReply('Frost Developers can\'t be room kicked');
                targetUser.popup('You have been kicked from room '+ room.title +' by '+user.name+'.');
                targetUser.leaveRoom(room);
                room.add('|raw|'+ targetUser.name + ' has been kicked from room by '+ user.name + '.');
                this.logRoomCommand(targetUser.name + ' has been kicked from room by '+ user.name + '.', room.id);
        },
 
        rb: 'roomban',
        roomban: function (target, room, user, connection) {
                if (!target) return this.parse('/help roomban');
 
                target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                var name = this.targetUsername;
                var userid = toId(name);
 
                if (!userid || !targetUser) return this.sendReply("User '" + name + "' does not exist.");
                if (!this.can('ban', targetUser, room)) return false;
                if (!room.bannedUsers || !room.bannedIps) {
                        return this.sendReply("Room bans are not meant to be used in room " + room.id + ".");
                }
                room.bannedUsers[userid] = true;
                for (var ip in targetUser.ips) {
                        room.bannedIps[ip] = true;
                }
                targetUser.popup("" + user.name + " has banned you from the room " + room.id + ". To appeal the ban, PM the moderator that banned you or a room owner." + (target ? " (" + target + ")" : ""));
                this.addModCommand("" + targetUser.name + " was banned from room " + room.id + " by " + user.name + "." + (target ? " (" + target + ")" : ""));
                var alts = targetUser.getAlts();
                if (alts.length) {
                        this.addModCommand("" + targetUser.name + "'s alts were also banned from room " + room.id + ": " + alts.join(", "));
                        for (var i = 0; i < alts.length; ++i) {
                                var altId = toId(alts[i]);
                                this.add('|unlink|' + altId);
                                room.bannedUsers[altId] = true;
                        }
                }
                this.add('|unlink|' + targetUser.userid);
                targetUser.leaveRoom(room.id);
        },
 
        roomunban: function (target, room, user, connection) {
                if (!target) return this.parse('/help roomunban');
 
                target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                var name = this.targetUsername;
                var userid = toId(name);
                var success;
 
                if (!userid || !targetUser) return this.sendReply("User '" + name + "' does not exist.");
                if (!this.can('ban', targetUser, room)) return false;
                if (!room.bannedUsers || !room.bannedIps) {
                        return this.sendReply("Room bans are not meant to be used in room " + room.id + ".");
                }
                if (room.bannedUsers[userid]) {
                        delete room.bannedUsers[userid];
                        success = true;
                }
                for (var ip in targetUser.ips) {
                        if (room.bannedIps[ip]) {
                                delete room.bannedIps[ip];
                                success = true;
                        }
                }
                if (!success) return this.sendReply("User " + targetUser.name + " is not banned from room " + room.id + ".");
 
                targetUser.popup("" + user.name + " has unbanned you from the room " + room.id + ".");
                this.addModCommand("" + targetUser.name + " was unbanned from room " + room.id + " by " + user.name + ".");
                var alts = targetUser.getAlts();
                if (!alts.length) return;
                for (var i = 0; i < alts.length; ++i) {
                        var altId = toId(alts[i]);
                        if (room.bannedUsers[altId]) delete room.bannedUsers[altId];
                }
                this.addModCommand("" + targetUser.name + "'s alts were also unbanned from room " + room.id + ": " + alts.join(", "));
        },
       
        roomauth: function (target, room, user, connection) {
                if (!room.auth) return this.sendReply("/roomauth - This room isn't designed for per-room moderation and therefore has no auth list.");
                var buffer = [];
                for (var u in room.auth) {
                        buffer.push(room.auth[u] + u);
                }
                if (buffer.length > 0) {
                        buffer = buffer.join(", ");
                } else {
                        buffer = "This room has no auth.";
                }
                connection.popup(buffer);
        },
 
        leave: 'part',
        part: function (target, room, user, connection) {
                if (room.id === 'global') return false;
                var targetRoom = Rooms.get(target);
                if (target && !targetRoom) {
                        return this.sendReply("The room '" + target + "' does not exist.");
                }
                user.leaveRoom(targetRoom || room, connection);
        },
 
        /*********************************************************
         * Moderating: Punishments
         *********************************************************/
 
        warn: function (target, room, user) {
                if (!target) return this.parse('/help warn');
 
                var warnMax = 4;
                function isOdd(num) { return num % 2;}
 
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser || !targetUser.connected) {
                        return this.sendReply("User " + this.targetUsername + " not found.");
                }
                if (!room.isOfficial) {
                        return this.sendReply('You can\'t warn here: This is a privately-owned room not subject to global rules.');
                }
                if (target.length > MAX_REASON_LENGTH) {
                        return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
                }
                if (!this.can('warn', targetUser, room)) return false;
                if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before warning them.');
 
                targetUser.warnTimes += 1;
                targetUser.punished = true;
                targetUser.punishTimer = setTimeout(function(){
                        targetUser.punished = false;
                },7000);
 
                if (targetUser.warnTimes >= warnMax && !room.auth) {
                        if (targetUser.warnTimes === 4) {
                                targetUser.popup('You have been automatically muted for 7 minutes due to being warned '+warnMax+' times.');
                                targetUser.mute(room.id, 7*60*1000);
                                this.addModCommand(''+targetUser.name+' was automatically muted for 7 minutes.');
                                var alts = targetUser.getAlts();
                                if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "), room.id);
                                return;
                        }
                        else if (targetUser.warnTimes >= 6 && isOdd(targetUser.warnTimes) === 0) {
                                targetUser.popup('You have been automatically muted for 60 minutes due to being warned '+warnMax+' or more times.');
                                targetUser.mute(room.id, 60*60*1000);
                                this.addModCommand(''+targetUser.name+' was automatically muted for 60 minutes.');
                                var alts = targetUser.getAlts();
                                if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "), room.id);
                                return;
                        }
                }
 
                this.addModCommand(''+targetUser.name+' was warned by '+user.name+'.' + (target ? " (" + target + ")" : ""));
                targetUser.send('|c|~|/warn '+target);
                try {
                        frostcommands.addWarnCount(user.userid);
                } catch (e) {
                        return;
                }
                this.add('|unlink|' + this.getLastIdOf(targetUser));
        },
       
        kickto: 'redir',
        redirect: 'redir',
        redir: function (target, room, user, connection) {
                if (!target) return this.parse('/help redirect');
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                var targetRoom = Rooms.get(target) || Rooms.get(toId(target));
                if (!targetRoom) {
                        return this.sendReply("/help redir - You need to add a room to redirect the user to");
                }
                if (!this.can('warn', targetUser, room) || !this.can('warn', targetUser, targetRoom)) return false;
                if (!targetUser || !targetUser.connected) {
                        return this.sendReply("User " + this.targetUsername + " not found.");
                }
                if (Rooms.rooms[targetRoom.id].users[targetUser.userid]) {
                        return this.sendReply("User " + targetUser.name + " is already in the room " + target + "!");
                }
                if (!Rooms.rooms[room.id].users[targetUser.userid]) {
                        return this.sendReply("User " + this.targetUsername + " is not in the room " + room.id + ".");
                }
                if (targetUser.joinRoom(target) === false) return this.sendReply('User "' + targetUser.name + '" could not be joined to room ' + target + '. They could be banned from the room.');
                var roomName = (targetRoom.isPrivate)? 'a private room' : 'room ' + target;
                this.addModCommand(targetUser.name + ' was redirected to ' + roomName + ' by ' + user.name + '.');
                targetUser.leaveRoom(room);
        },
 
        m: 'mute',
        mute: function (target, room, user) {
                if (!target) return this.parse('/help mute');
 
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser) {
                        return this.sendReply("User " + this.targetUsername + " not found.");
                }
                if (target.length > MAX_REASON_LENGTH) {
                        return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
                }
                if (!this.can('mute', targetUser, room)) return false;
                if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before muting them.');
                if (targetUser.mutedRooms[room.id] || targetUser.locked || !targetUser.connected) {
                        var problem = " but was already " + (!targetUser.connected ? "offline" : targetUser.locked ? "locked" : "muted");
                        if (!target) {
                                return this.privateModCommand("(" + targetUser.name + " would be muted by " + user.name + problem + ".)");
                        }
                        return this.addModCommand("" + targetUser.name + " would be muted by " + user.name + problem + "." + (target ? " (" + target + ")" : ""));
                }
                targetUser.punished = true;
                targetUser.punishTimer = setTimeout(function(){
                        targetUser.punished = false;
                },7000);
                targetUser.popup(user.name+' has muted you for 7 minutes. '+target);
                this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 7 minutes.' + (target ? " (" + target + ")" : ""));
                var alts = targetUser.getAlts();
                if (alts.length) this.addModCommand("" + targetUser.name + "'s alts were also muted: " + alts.join(", "));
                this.add('|unlink|' + this.getLastIdOf(targetUser));
 
                targetUser.mute(room.id, 7 * 60 * 1000);
                try {
                        frostcommands.addMuteCount(user.userid);
                } catch (e) {
                        return;
                }
        },
 
        hourmute: function(target, room, user) {
                if (!target) return this.parse('/help hourmute');
 
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser) {
                        return this.sendReply("User " + this.targetUsername + " not found.");
                }
                if (target.length > MAX_REASON_LENGTH) {
                        return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
                }
                if (!this.can('mute', targetUser, room)) return false;
                if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before muting them.');
                if (targetUser.mutedRooms[room.id] || targetUser.locked || !targetUser.connected) {
                        var problem = ' but was already '+(!targetUser.connected ? 'offline' : targetUser.locked ? 'locked' : 'muted');
                        if (!target && !room.auth) {
                                return this.privateModCommand('('+targetUser.name+' would be muted by '+user.name+problem+'.)');
                        }
                        return this.addModCommand(''+targetUser.name+' would be muted by '+user.name+problem+'.' + (target ? " (" + target + ")" : ""));
                }
                targetUser.punished = true;
                targetUser.punishTimer = setTimeout(function(){
                        targetUser.punished = false;
                },7000);
                targetUser.popup(user.name+' has muted you for 60 minutes. '+target);
                this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 60 minutes.' + (target ? " (" + target + ")" : ""));
                var alts = targetUser.getAlts();
                if (alts.length) this.addModCommand(""+targetUser.name+"'s alts were also muted: "+alts.join(", "));
                targetUser.mute(room.id, 60*60*1000);
                this.add('|unlink|' + targetUser.userid);
                try {
                        frostcommands.addMuteCount(user.userid);
                } catch (e) {
                        return;
                }
        },
 
        dmute : 'daymute',
        daymute: function(target, room, user) {
                if (!target) return this.parse('/help hourmute');
 
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser) {
                        return this.sendReply('User '+this.targetUsername+' not found.');
                }
                if (target.length > MAX_REASON_LENGTH) {
                        return this.sendReply('The reason is too long. It cannot exceed ' + MAX_REASON_LENGTH + ' characters.');
                }
                if (!this.can('mute', targetUser, room)) return false;
                if (targetUser.punished) return this.sendReply(targetUser.name+' has recently been warned, muted, or locked. Please wait a few seconds before muting them.');
                if (targetUser.mutedRooms[room.id] || targetUser.locked || !targetUser.connected) {
                        var problem = ' but was already '+(!targetUser.connected ? 'offline' : targetUser.locked ? 'locked' : 'muted');
                        if (!target && !room.auth) {
                                return this.privateModCommand('('+targetUser.name+' would be muted by '+user.name+problem+'.)');
                        }
                        return this.addModCommand(''+targetUser.name+' would be muted by '+user.name+problem+'.' + (target ? " (" + target + ")" : ""));
                }
                targetUser.punished = true;
                targetUser.punishTimer = setTimeout(function(){
                        targetUser.punished = false;
                },7000);
                targetUser.popup(user.name+' has muted you for 24 hours. '+target);
                this.addModCommand(''+targetUser.name+' was muted by '+user.name+' for 24 hours.' + (target ? " (" + target + ")" : ""));
                var alts = targetUser.getAlts();
                if (alts.length) this.addModCommand("" + targetUser.name + "'s alts were also muted: " + alts.join(", "));
                this.add('|unlink|' + this.getLastIdOf(targetUser));
 
                targetUser.mute(room.id, 60 * 60 * 1000, true);
                try {
                        frostcommands.addMuteCount(user.userid);
                } catch (e) {
                        return;
                }
        },
 
        um: 'unmute',
        unmute: function (target, room, user) {
                if (!target) return this.parse('/help unmute');
                var targetUser = Users.get(target);
                if (!targetUser) {
                        return this.sendReply("User " + target + " not found.");
                }
                if (!this.can('mute', targetUser, room)) return false;
                if (!targetUser.mutedRooms[room.id]) {
                        return this.sendReply("" + targetUser.name + " isn't muted.");
                }
                this.addModCommand(''+targetUser.name+' was unmuted by '+user.name+'.');
                targetUser.unmute(room.id);
        },
 
        l: 'lock',
        ipmute: 'lock',
        lock: function (target, room, user) {
                if (!target) return this.parse('/help lock');
 
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser) {
                        return this.sendReply("User " + this.targetUser + " not found.");
                }
                if (target.length > MAX_REASON_LENGTH) {
                        return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
                }
                if (!this.can('lock', targetUser)) return false;
 
                if ((targetUser.locked || Users.checkBanned(targetUser.latestIp)) && !target) {
                        var problem = " but was already " + (targetUser.locked ? "locked" : "banned");
                        return this.privateModCommand("(" + targetUser.name + " would be locked by " + user.name + problem + ".)");
                }
 
                targetUser.popup("" + user.name + " has locked you from talking in chats, battles, and PMing regular users.\n\n" + target + "\n\nIf you feel that your lock was unjustified, you can still PM staff members (%, @, &, and ~) to discuss it.");
 
                this.addModCommand("" + targetUser.name + " was locked from talking by " + user.name + "." + (target ? " (" + target + ")" : ""));
                var alts = targetUser.getAlts();
                if (alts.length) this.addModCommand("" + targetUser.name + "'s alts were also locked: " + alts.join(", "));
                this.add('|unlink|' + this.getLastIdOf(targetUser));
 
                targetUser.lock();
        },
 
        unlock: function (target, room, user) {
                if (!target) return this.parse('/help unlock');
                if (!this.can('lock')) return false;
 
                var unlocked = Users.unlock(target);
 
                if (unlocked) {
                        var names = Object.keys(unlocked);
                        this.addModCommand(names.join(", ") + " " +
                                ((names.length > 1) ? "were" : "was") +
                                " unlocked by " + user.name + ".");
                } else {
                        this.sendReply("User " + target + " is not locked.");
                }
        },
 
        b: 'ban',
        ban: function (target, room, user) {
                if (!target) return this.parse('/help ban');
 
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser) {
                        return this.sendReply("User " + this.targetUsername + " not found.");
                }
                if (target.length > MAX_REASON_LENGTH) {
                        return this.sendReply("The reason is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
                }
                if (!this.can('ban', targetUser)) return false;
 
                if (Users.checkBanned(targetUser.latestIp) && !target && !targetUser.connected) {
                        var problem = " but was already banned";
                        return this.privateModCommand("(" + targetUser.name + " would be banned by " + user.name + problem + ".)");
                }
 
                targetUser.popup("" + user.name + " has banned you." + (Config.appealurl ? (" If you feel that your banning was unjustified you can appeal the ban:\n" + Config.appealurl) : "") + "\n\n" + target);
 
                this.addModCommand("" + targetUser.name + " was banned by " + user.name + "." + (target ? " (" + target + ")" : ""), " (" + targetUser.latestIp + ")");
                var alts = targetUser.getAlts();
                if (alts.length) {
                        this.addModCommand("" + targetUser.name + "'s alts were also banned: " + alts.join(", "));
                        for (var i = 0; i < alts.length; ++i) {
                                this.add('|unlink|' + toId(alts[i]));
                        }
                }
 
                this.add('|unlink|' + this.getLastIdOf(targetUser));
                targetUser.ban();
        },
 
        unban: function (target, room, user) {
                if (!target) return this.parse('/help unban');
                if (!this.can('ban')) return false;
 
                var name = Users.unban(target);
 
                if (name) {
                        this.addModCommand("" + name + " was unbanned by " + user.name + ".");
                } else {
                        this.sendReply("User " + target + " is not banned.");
                }
        },
 
        unbanall: function (target, room, user) {
                if (!this.can('rangeban')) return false;
                // we have to do this the hard way since it's no longer a global
                for (var i in Users.bannedIps) {
                        delete Users.bannedIps[i];
                }
                for (var i in Users.lockedIps) {
                        delete Users.lockedIps[i];
                }
                this.addModCommand("All bans and locks have been lifted by " + user.name + ".");
        },
 
        banip: function (target, room, user) {
                target = target.trim();
                if (!target) {
                        return this.parse('/help banip');
                }
                if (!this.can('rangeban')) return false;
 
                Users.bannedIps[target] = '#ipban';
                this.addModCommand("" + user.name + " temporarily banned the " + (target.charAt(target.length - 1) === '*' ? "IP range" : "IP") + ": " + target);
        },
 
        unbanip: function (target, room, user) {
                target = target.trim();
                if (!target) {
                        return this.parse('/help unbanip');
                }
                if (!this.can('rangeban')) return false;
                if (!Users.bannedIps[target]) {
                        return this.sendReply("" + target + " is not a banned IP or IP range.");
                }
                delete Users.bannedIps[target];
                this.addModCommand("" + user.name + " unbanned the " + (target.charAt(target.length - 1) === '*' ? "IP range" : "IP") + ": " + target);
        },
 
        /*********************************************************
         * Moderating: Other
         *********************************************************/
 
        modnote: function (target, room, user, connection, cmd) {
                if (!target) return this.parse('/help note');
                if (target.length > MAX_REASON_LENGTH) {
                        return this.sendReply("The note is too long. It cannot exceed " + MAX_REASON_LENGTH + " characters.");
                }
                if (!this.can('mute')) return false;
                return this.privateModCommand("(" + user.name + " notes: " + target + ")");
        },
 
        demote: 'promote',
        promote: function (target, room, user, connection, cmd) {
                if (!target) return this.parse('/help promote');
 
                target = this.splitTarget(target, true);
                var targetUser = this.targetUser;
                var userid = toId(this.targetUsername);
                var name = targetUser ? targetUser.name : this.targetUsername;
 
                if (!userid) return this.parse('/help promote');
 
                var currentGroup = ((targetUser && targetUser.group) || Users.usergroups[userid] || ' ')[0];
                var nextGroup = target ? target : Users.getNextGroupSymbol(currentGroup, cmd === 'demote', true);
                if (target === 'deauth') nextGroup = Config.groupsranking[0];
                if (!Config.groups[nextGroup]) {
                        return this.sendReply("Group '" + nextGroup + "' does not exist.");
                }
                if (Config.groups[nextGroup].roomonly) {
                        return this.sendReply("Group '" + nextGroup + "' does not exist as a global rank.");
                }
 
                var groupName = Config.groups[nextGroup].name || "regular user";
                if (currentGroup === nextGroup) {
                        return this.sendReply("User '" + name + "' is already a " + groupName);
                }
                if (!user.canPromote(currentGroup, nextGroup)) {
                        return this.sendReply("/" + cmd + " - Access denied.");
                }
 
                if (!Users.setOfflineGroup(name, nextGroup)) {
                        return this.sendReply("/promote - WARNING: This user is offline and could be unregistered. Use /forcepromote if you're sure you want to risk it.");
                }
                if (Config.groups[nextGroup].rank < Config.groups[currentGroup].rank) {
                        this.privateModCommand("(" + name + " was demoted to " + groupName + " by " + user.name + ".)");
                        if (targetUser) targetUser.popup("You were demoted to " + groupName + " by " + user.name + ".");
                } else {
                        this.addModCommand("" + name + " was promoted to " + groupName + " by " + user.name + ".");
                }
 
                if (targetUser) targetUser.updateIdentity();
        },
 
        forcepromote: function (target, room, user) {
                // warning: never document this command in /help
                if (!this.can('forcepromote')) return false;
                target = this.splitTarget(target, true);
                var name = this.targetUsername;
                var nextGroup = target || Users.getNextGroupSymbol(' ', false);
 
                if (!Users.setOfflineGroup(name, nextGroup, true)) {
                        return this.sendReply("/forcepromote - Don't forcepromote unless you have to.");
                }
 
                this.addModCommand("" + name + " was promoted to " + (Config.groups[nextGroup].name || "regular user") + " by " + user.name + ".");
        },
 
        deauth: function (target, room, user) {
                return this.parse('/demote ' + target + ', deauth');
        },
 
        modchat: function (target, room, user) {
                if (!target) return this.sendReply("Moderated chat is currently set to: " + room.modchat);
                if (!this.can('modchat', null, room)) return false;
 
                if (room.modchat && room.modchat.length <= 1 && Config.groupsranking.indexOf(room.modchat) > 1 && !user.can('modchatall', null, room)) {
                        return this.sendReply("/modchat - Access denied for removing a setting higher than " + Config.groupsranking[1] + ".");
                }
 
                target = target.toLowerCase();
                var currentModchat = room.modchat;
                switch (target) {
                case 'off':
                case 'false':
                case 'no':
                        room.modchat = false;
                        break;
                case 'ac':
                case 'autoconfirmed':
                        room.modchat = 'autoconfirmed';
                        break;
                case '*':
                case 'player':
                        target = '\u2605';
                        // fallthrough
                default:
                        if (!Config.groups[target]) {
                                return this.parse('/help modchat');
                        }
                        if (Config.groupsranking.indexOf(target) > 1 && !user.can('modchatall', null, room)) {
                                return this.sendReply("/modchat - Access denied for setting higher than " + Config.groupsranking[1] + ".");
                        }
                        room.modchat = target;
                        break;
                }
                if (currentModchat === room.modchat) {
                        return this.sendReply("Modchat is already set to " + currentModchat + ".");
                }
                if (!room.modchat) {
                        this.add("|raw|<div class=\"broadcast-blue\"><b>Moderated chat was disabled!</b><br />Anyone may talk now.</div>");
                } else {
                        var modchat = sanitize(room.modchat);
                        this.add("|raw|<div class=\"broadcast-red\"><b>Moderated chat was set to " + modchat + "!</b><br />Only users of rank " + modchat + " and higher can talk.</div>");
                }
                this.logModCommand(user.name + " set modchat to " + room.modchat);
 
                if (room.chatRoomData) {
                        room.chatRoomData.modchat = room.modchat;
                        Rooms.global.writeChatRoomData();
                }
        },
 
        declaregreen: 'declare',
        declarered: 'declare',
        declare: function(target, room, user, connection, cmd) {
                /*if (user.userid === 'shadowninjask') return false;**/
                if (!target) return this.parse('/help declare');
                if (!this.can('declare', null, room)) return false;
 
                if (!this.canTalk()) return;
 
                if (cmd === 'declare') {
                        this.add('|raw|<div class="broadcast-blue"><b>'+target+'</b></div>');
                }
                else if (cmd === 'declarered') {
                        this.add('|raw|<div class="broadcast-red"><b>'+target+'</b></div>');
                }
                else if (cmd === 'declaregreen') {
                        this.add('|raw|<div class="broadcast-green"><b>'+target+'</b></div>');
                }
                if (!room.auth) {
                        this.logModCommand(user.name+' declared '+target);
                }
                if (room.auth) {
                        this.logModCommand(user.name+' declared '+target);
                }
        },
 
        gdeclarered: 'gdeclare',
        gdeclaregreen: 'gdeclare',
        gdeclare: function(target, room, user, connection, cmd) {
                if (!target) return this.parse('/help '+cmd);
                if (!this.can('gdeclare')) return false;
                var staff = '';
                this.logModCommand(user.name+' global declared '+target);
                if (user.group == '~') staff = 'an Administrator';
 
                //var roomName = (room.isPrivate)? 'a private room' : room.id;
 
                if (cmd === 'gdeclare'){
                        for (var id in Rooms.rooms) {
                                if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-blue"><b><font size=1><i>Global declare from '+staff+'<br /></i></font size>'+target+'</b></div>');
                        }
                }
                if (cmd === 'gdeclarered'){
                        for (var id in Rooms.rooms) {
                                if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-red"><b><font size=1><i>Global declare from '+staff+'<br /></i></font size>'+target+'</b></div>');
                        }
                }
                else if (cmd === 'gdeclaregreen'){
                        for (var id in Rooms.rooms) {
                                if (id !== 'global') Rooms.rooms[id].addRaw('<div class="broadcast-green"><b><font size=1><i>Global declare from '+staff+'<br /></i></font size>'+target+'</b></div>');
                        }
                }
                this.logModCommand(user.name+' globally declared '+target);
        },
 
        pgdeclare: function(target, room, user) {
                if (!target) return this.parse('/help pgdeclare');
                if (!this.can('pgdeclare')) return;
 
                if (!this.canTalk()) return;
 
                for (var r in Rooms.rooms) {
                        if (Rooms.rooms[r].type === 'chat') Rooms.rooms[r].add('|raw|<b>'+target+'</b></div>');
                }
 
                this.logModCommand(user.name+' declared '+target+' to all rooms.');
        },
 
        modmsg: 'declaremod',
        moddeclare: 'declaremod',
        declaremod: function(target, room, user) {
                if (!target) return this.sendReply('/declaremod [message] - Also /moddeclare and /modmsg');
                if (!this.can('declare', null, room)) return false;
 
                if (!this.canTalk()) return;
 
                this.privateModCommand('|raw|<div class="broadcast-red"><b><font size=1><i>Private Auth (Driver +) declare from '+user.name+'<br /></i></font size>'+target+'</b></div>');
 
                this.logModCommand(user.name+' mod declared '+target);
        },
 
        cdeclare: 'chatdeclare',
        chatdeclare: function(target, room, user) {
                if (!target) return this.parse('/help chatdeclare');
                if (!this.can('gdeclare')) return false;
 
                for (var id in Rooms.rooms) {
                        if (id !== 'global') if (Rooms.rooms[id].type !== 'battle') Rooms.rooms[id].addRaw('<div class="broadcast-blue"><b>'+target+'</b></div>');
                }
                this.logModCommand(user.name+' globally declared (chat level) '+target);
        },
        wall: 'announce',
        announce: function (target, room, user) {
                if (!target) return this.parse('/help announce');
 
                if (!this.can('announce', null, room)) return false;
 
                target = this.canTalk(target);
                if (!target) return;
 
                return '/announce ' + target;
        },
 
        fr: 'forcerename',
        forcerename: function (target, room, user) {
                if (!target) return this.parse('/help forcerename');
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser) {
                        return this.sendReply("User " + this.targetUsername + " not found.");
                }
                if (!this.can('forcerename', targetUser)) return false;
 
                if (targetUser.userid === toId(this.targetUser)) {
                        var entry = targetUser.name + " was forced to choose a new name by " + user.name + (target ? ": " + target: "");
                        this.privateModCommand("(" + entry + ")");
                        Rooms.global.cancelSearch(targetUser);
                        targetUser.resetName();
                        targetUser.send("|nametaken||" + user.name + " has forced you to change your name. " + target);
                } else {
                        this.sendReply("User " + targetUser.name + " is no longer using that name.");
                }
        },
       
         spam: 'spamroom',
        spamroom: function (target, room, user) {
                if (!target) return this.sendReply("Please specify a user.");
                this.splitTarget(target);
 
                if (!this.targetUser) {
                        return this.sendReply("The user '" + this.targetUsername + "' does not exist.");
                }
                if (!this.can('mute', this.targetUser)) {
                        return false;
                }
 
                var targets = Spamroom.addUser(this.targetUser);
                if (targets.length === 0) {
                        return this.sendReply("That user's messages are already being redirected to the spamroom.");
                }
                this.privateModCommand("(" + user.name + " has added to the spamroom user list: " + targets.join(", ") + ")");
        },
 
        unspam: 'unspamroom',
        unspamroom: function (target, room, user) {
                if (!target) return this.sendReply("Please specify a user.");
                this.splitTarget(target);
 
                if (!this.can('mute')) {
                        return false;
                }
 
                var targets = Spamroom.removeUser(this.targetUser || this.targetUsername);
                if (targets.length === 0) {
                        return this.sendReply("That user is not in the spamroom list.");
                }
                this.privateModCommand("(" + user.name + " has removed from the spamroom user list: " + targets.join(", ") + ")");
        },
 
        customavatars: 'customavatar',
        customavatar: (function () {
                const script = (function () {/*
                        FILENAME=`mktemp`
                        function cleanup {
                                rm -f $FILENAME
                        }
                        trap cleanup EXIT
 
                        set -xe
 
                        timeout 10 wget "$1" -nv -O $FILENAME
 
                        FRAMES=`identify $FILENAME | wc -l`
                        if [ $FRAMES -gt 1 ]; then
                                EXT=".gif"
                        else
                                EXT=".png"
                        fi
 
                        timeout 10 convert $FILENAME -layers TrimBounds -coalesce -adaptive-resize 80x80\> -background transparent -gravity center -extent 80x80 "$2$EXT"
                */}).toString().match(/[^]*\/\*([^]*)\*\/\}$/)[1];
 
                var pendingAdds = {};
                return function (target) {
                        var parts = target.split(',');
                        var cmd = parts[0].trim().toLowerCase();
 
                        if (cmd in {'':1, show:1, view:1, display:1}) {
                                var message = "";
                                for (var a in Config.customAvatars)
                                        message += "<strong>" + sanitize(a) + ":</strong> " + sanitize(Config.customAvatars[a]) + "<br />";
                                return this.sendReplyBox(message);
                        }
 
                        if (!this.can('customavatar')) return false;
 
                        switch (cmd) {
                                case 'set':
                                        var userid = toId(parts[1]);
                                        var user = Users.getExact(userid);
                                        var avatar = parts.slice(2).join(',').trim();
 
                                        if (!userid) return this.sendReply("You didn't specify a user.");
                                        if (Config.customAvatars[userid]) return this.sendReply(userid + " already has a custom avatar.");
 
                                        var hash = require('crypto').createHash('sha512').update(userid + '\u0000' + avatar).digest('hex').slice(0, 8);
                                        pendingAdds[hash] = {userid: userid, avatar: avatar};
                                        parts[1] = hash;
 
                                        if (!user) {
                                                this.sendReply("Warning: " + userid + " is not online.");
                                                this.sendReply("If you want to continue, use: /customavatar forceset, " + hash);
                                                return;
                                        }
                                        // Fallthrough
 
                                case 'forceset':
                                        var hash = parts[1].trim();
                                        if (!pendingAdds[hash]) return this.sendReply("Invalid hash.");
 
                                        var userid = pendingAdds[hash].userid;
                                        var avatar = pendingAdds[hash].avatar;
                                        delete pendingAdds[hash];
 
                                        require('child_process').execFile('bash', ['-c', script, '-', avatar, './config/avatars/' + userid], (function (e, out, err) {
                                                if (e) {
                                                        this.sendReply(userid + "'s custom avatar failed to be set. Script output:");
                                                        (out + err).split('\n').forEach(this.sendReply.bind(this));
                                                        return;
                                                }
 
                                                reloadCustomAvatars();
                                                this.sendReply(userid + "'s custom avatar has been set.");
                                        }).bind(this));
                                        break;
 
                                case 'delete':
                                        var userid = toId(parts[1]);
                                        if (!Config.customAvatars[userid]) return this.sendReply(userid + " does not have a custom avatar.");
 
                                        if (Config.customAvatars[userid].toString().split('.').slice(0, -1).join('.') !== userid)
                                                return this.sendReply(userid + "'s custom avatar (" + Config.customAvatars[userid] + ") cannot be removed with this script.");
                                        require('fs').unlink('./config/avatars/' + Config.customAvatars[userid], (function (e) {
                                                if (e) return this.sendReply(userid + "'s custom avatar (" + Config.customAvatars[userid] + ") could not be removed: " + e.toString());
 
                                                delete Config.customAvatars[userid];
                                                this.sendReply(userid + "'s custom avatar removed successfully");
                                        }).bind(this));
                                        break;
 
                                default:
                                        return this.sendReply("Invalid command. Valid commands are `/customavatar set, user, avatar` and `/customavatar delete, user`.");
                        }
                };
        })(),
       
        sca: 'giveavatar',
        setcustomavatar: 'giveavatar',
        setcustomavi: 'giveavatar',
        giveavatar: function(target, room, user, connection) {
      if (user.userid !== 'judgmental' && user.userid !== 'thaumicscrafty') return this.sendReply('/giveavatar - Access denied.');
        try {
            request = require('request');
        } catch (e) {
            return this.sendReply('/giveavatar requires the request module. Please run "npm install request" before using this command.');
        }
        if (!target) return this.sendReply('Usage: /giveavatar [username], [image] - Gives [username] the image specified as their avatar. -' +
            'Images are required to be .PNG or .GIF. Requires: & ~');
        parts = target.split(',');
        if (!parts[0] || !parts[1]) return this.sendReply('Usage: /giveavatar [username], [image] - Gives [username] the image specified as their avatar. -<br />' +
            'Images are required to be .PNG or .GIF. Requires: & ~');
        targetUser = Users.get(parts[0].trim());
        filename = parts[1].trim();
        uri = filename;
        filename = targetUser.userid + filename.slice(filename.toLowerCase().length - 4,filename.length);
        filetype = filename.slice(filename.toLowerCase().length - 4,filename.length);
        if (filetype != '.png' && filetype != '.gif') {
            return this.sendReply('/giveavatar - Invalid image format. Images are required to be in either PNG or GIF format.');
        }
        if (!targetUser) return this.sendReply('User '+target+' not found.');
        self = this;
        var download = function(uri, filename, callback) {
            request.head(uri, function(err, res, body) {
                var r = request(uri).pipe(fs.createWriteStream('config/avatars/'+filename));
                r.on('close', callback);
            });
        };
        download(uri, filename, function(err, res, body){
            if (err) return console.log('/giveavatar error: '+err);
            fs.readFile('config/avatars.csv','utf8',function(err, data) {
                if (err) return self.sendReply('/giveavatar erred: '+e.stack);
                match = false;
                var row = (''+data).split("\n");
                var line = '';
                for (var i = row.length; i > -1; i--) {
                    if (!row[i]) continue;
                    var parts = row[i].split(",");
                    if (targetUser.userid == parts[0]) {
                        match = true;
                        line = line + row[i];
                        break;
                    }
                }
                if (match === true) {
                    var re = new RegExp(line,"g");
                    var result = data.replace(re, targetUser.userid+','+filename);
                    fs.writeFile('config/avatars.csv', result, 'utf8', function (err) {
                        if (err) return console.log(err);
                    });
                        for (var u in Users.customAvatars) {
                                var column = Users.customAvatars[u].split(',');
                                if (column[0] == targetUser.userid) {
                                        Users.customAvatars[u] = targetUser.userid+','+filename;
                                        break;
                                }
                        }
                } else {
                    fs.appendFile('config/avatars.csv','\n'+targetUser.userid+','+filename);
                    Users.customAvatars.push(targetUser.userid+','+filename);
                }
                self.sendReply(targetUser.name+' has received a custom avatar.');
                targetUser.avatar = filename;
                targetUser.sendTo(room, 'You have received a custom avatar from ' + user.name + '.');
                for (var u in Users.users) {
                    if (Users.users[u].group == "~" || Users.users[u].group == "&") {
                        Users.users[u].send('|pm|~Server|'+Users.users[u].group+Users.users[u].name+'|'+targetUser.name+' has received a custom avatar from '+user.name+'.');
                    }
                }
                Rooms.rooms.staff.add(targetUser.name+' has received a custom avatar from '+user.name+'.');
                if (filetype == '.gif' && targetUser.canAnimatedAvatar) targetUser.canAnimatedAvatar = false;
                if (filetype == '.png' && targetUser.canCustomAvatar) targetUser.canCustomAvatar = false;
            });
        });
        },
 
 
 
        cry: 'complain',
        bitch: 'complain',
        complaint: 'complain',
        complain: function(target, room, user) {
                if(!target) return this.parse('/help complaint');
                if (user.userid === "thaumicscrafty") {
                        user.ban();
                        user.send('|popup|nice try fucker')
                }
                this.sendReplyBox('Thanks for your input. We\'ll review your feedback soon. The complaint you submitted was: ' + target);
                this.logComplaints(target);
        },
 
        modlog: function(target, room, user, connection) {
                if (!this.can('modlog')) {
                        return this.sendReply('/modlog - Access denied.');
                }
                var lines = parseInt(target || 15, 10);
                if (lines > 100) lines = 100;
                var roomId = room.id;
                var roomLogs = {};
 
                if (target.indexOf(',') > -1) {
                        var targets = target.split(',');
                        target = targets[1].trim();
                        roomId = toId(targets[0]) || room.id;
                }
 
                // Let's check the number of lines to retrieve or if it's a word instead
                if (!target.match('[^0-9]')) {
                        lines = parseInt(target || 15, 10);
                        if (lines > 100) lines = 100;
                }
                var wordSearch = (!lines || lines < 0);
 
                // Control if we really, really want to check all modlogs for a word.
                var roomNames = '';
                var filename = '';
                var command = '';
                if (roomId === 'all' && wordSearch) {
                        if (!this.can('modlog')) return;
                        roomNames = 'all rooms';
                        // Get a list of all the rooms
                        var fileList = fs.readdirSync('logs/modlog');
                        for (var i = 0; i < fileList.length; ++i) {
                                filename += 'logs/modlog/' + fileList[i] + ' ';
                        }
                } else {
                        if (!this.can('modlog', null, Rooms.get(roomId))) return;
                        roomNames = 'the room ' + roomId;
                        filename = 'logs/modlog/modlog_' + roomId + '.txt';
                }
 
                if (!lines || lines < 0) {
                        if (target.match(/^["'].+["']$/)) target = target.substring(1, target.length-1);
                }
                target = target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]');
                var data = fs.readFileSync(filename, 'utf8');
                data = data.split("\n");
                var newArray = [];
                for (var i = 0; i < data.length; i++) {
                        if (data[i].toLowerCase().indexOf(target.toLowerCase()) > -1) {
                                newArray.push(data[i]);
                        }
                        if ((lines && newArray.length >= lines) || newArray.length >= 100) break;
                }
                stdout = newArray.join("\n");
                if (lines) {
                        if (!stdout) {
                                user.send('|popup|The modlog is empty. (Weird.)');
                        } else {
                                user.send('|popup|Displaying the last '+lines+' lines of the Moderator Log:\n\n' + sanitize(stdout));
                        }
                } else {
                        if (!stdout) {
                                user.send('|popup|No moderator actions containing "'+target+'" were found.');
                        } else {
                                user.send('|popup|Displaying the last 100 logged actions containing "'+target+'":\n\n' + sanitize(stdout));
                        }
                }
        },
 
        complaintslist: 'complaintlist',
        complaintlist: function(target, room, user, connection) {
                if (!this.can('declare')) {
                        return this.sendReply('/complaints - Access denied.');
                }
                var lines = parseInt(target || 15, 10);
                if (lines > 100) lines = 100;
                var filename = 'logs/complaints.txt';
                if (!lines || lines < 0) {
                        if (target.match(/^["'].+["']$/)) target = target.substring(1, target.length-1);
                }
                target = target.replace(/\\/g,'\\\\\\\\').replace(/["'`]/g,'\'\\$&\'').replace(/[\{\}\[\]\(\)\$\^\.\?\+\-\*]/g,'[$&]');
                var data = fs.readFileSync(filename, 'utf8');
                data = data.split("\n");
                var newArray = [];
                for (var i = 0; i < data.length; i++) {
                        if (data[i].toLowerCase().indexOf(target.toLowerCase()) > -1) {
                                newArray.push(data[i]);
                        }
                        if ((lines && newArray.length >= lines) || newArray.length >= 100) break;
                }
                stdout = newArray.join("\n");
                if (lines) {
                        if (!stdout) {
                                user.send('|popup|The complaints list is empty. (Weird.)');
                        } else {
                                user.send('|popup|Displaying the last '+lines+' lines of the Moderator Log:\n\n' + sanitize(stdout));
                        }
                } else {
                        if (!stdout) {
                                user.send('|popup|No moderator actions containing "'+target+'" were found.');
                        } else {
                                user.send('|popup|Displaying the last 100 logged actions containing "'+target+'":\n\n' + sanitize(stdout));
                        }
                }
        },
       
        bw: 'banword',
        banword: function (target, room, user) {
                if (!this.can('declare')) return false;
                target = toId(target);
                if (!target) {
                        return this.sendReply("Specify a word or phrase to ban.");
                }
                Users.addBannedWord(target);
                this.sendReply("Added '" + target + "' to the list of banned words.");
        },
 
        ubw: 'unbanword',
        unbanword: function (target, room, user) {
                if (!this.can('declare')) return false;
                target = toId(target);
                if (!target) {
                        return this.sendReply("Specify a word or phrase to unban.");
                }
                Users.removeBannedWord(target);
                this.sendReply("Removed '" + target + "' from the list of banned words.");
        },
 
        /*********************************************************
         * Server management commands
         *********************************************************/
 
        hotpatch: function (target, room, user) {
                if (!target) return this.parse('/help hotpatch');
                if (!this.can('hotpatch')) return false;
 
                this.logEntry(user.name + " used /hotpatch " + target);
 
                if (target === 'chat' || target === 'commands') {
 
                        try {
                                CommandParser.uncacheTree('./command-parser.js');
                                CommandParser = require('./command-parser.js');
 
                                var runningTournaments = Tournaments.tournaments;
                                CommandParser.uncacheTree('./tournaments/frontend.js');
                                Tournaments = require('./tournaments/frontend.js');
                                Tournaments.tournaments = runningTournaments;
 
                                return this.sendReply("Chat commands have been hot-patched.");
                        } catch (e) {
                                return this.sendReply("Something failed while trying to hotpatch chat: \n" + e.stack);
                        }
 
                } else if (target === 'tournaments') {
 
                        try {
                                var runningTournaments = Tournaments.tournaments;
                                CommandParser.uncacheTree('./tournaments/frontend.js');
                                Tournaments = require('./tournaments/frontend.js');
                                Tournaments.tournaments = runningTournaments;
                                return this.sendReply("Tournaments have been hot-patched.");
                        } catch (e) {
                                return this.sendReply("Something failed while trying to hotpatch tournaments: \n" + e.stack);
                        }
 
                } else if (target === 'battles') {
 
                        /*Simulator.SimulatorProcess.respawn();
                        return this.sendReply("Battles have been hotpatched. Any battles started after now will use the new code; however, in-progress battles will continue to use the old code.");*/
                        return this.sendReply("Battle hotpatching is not supported with the single process hack.");
 
                } else if (target === 'formats') {
                        /*try {
                                // uncache the tools.js dependency tree
                                CommandParser.uncacheTree('./tools.js');
                                // reload tools.js
                                Tools = require('./tools.js'); // note: this will lock up the server for a few seconds
                                // rebuild the formats list
                                Rooms.global.formatListText = Rooms.global.getFormatListText();
                                // respawn validator processes
                                TeamValidator.ValidatorProcess.respawn();
                                // respawn simulator processes
                                Simulator.SimulatorProcess.respawn();
                                // broadcast the new formats list to clients
                                Rooms.global.send(Rooms.global.formatListText);
 
                                return this.sendReply("Formats have been hotpatched.");
                        } catch (e) {
                                return this.sendReply("Something failed while trying to hotpatch formats: \n" + e.stack);
                        }*/
                        return this.sendReply("Formats hotpatching is not supported with the single process hack.");
 
                } else if (target === 'learnsets') {
                        try {
                                // uncache the tools.js dependency tree
                                CommandParser.uncacheTree('./tools.js');
                                // reload tools.js
                                Tools = require('./tools.js'); // note: this will lock up the server for a few seconds
 
                                return this.sendReply("Learnsets have been hotpatched.");
                        } catch (e) {
                                return this.sendReply("Something failed while trying to hotpatch learnsets: \n" + e.stack);
                        }
 
                }
                this.sendReply("Your hot-patch command was unrecognized.");
        },
 
        savelearnsets: function (target, room, user) {
                if (!this.can('hotpatch')) return false;
                fs.writeFile('data/learnsets.js', 'exports.BattleLearnsets = ' + JSON.stringify(BattleLearnsets) + ";\n");
                this.sendReply("learnsets.js saved.");
        },
 
        disableladder: function (target, room, user) {
                if (!this.can('disableladder')) return false;
                if (LoginServer.disabled) {
                        return this.sendReply("/disableladder - Ladder is already disabled.");
                }
                LoginServer.disabled = true;
                this.logModCommand("The ladder was disabled by " + user.name + ".");
                this.add("|raw|<div class=\"broadcast-red\"><b>Due to high server load, the ladder has been temporarily disabled</b><br />Rated games will no longer update the ladder. It will be back momentarily.</div>");
        },
 
        enableladder: function (target, room, user) {
                if (!this.can('disableladder')) return false;
                if (!LoginServer.disabled) {
                        return this.sendReply("/enable - Ladder is already enabled.");
                }
                LoginServer.disabled = false;
                this.logModCommand("The ladder was enabled by " + user.name + ".");
                this.add("|raw|<div class=\"broadcast-green\"><b>The ladder is now back.</b><br />Rated games will update the ladder now.</div>");
        },
 
        lockdown: function (target, room, user) {
                if (!this.can('lockdown')) return false;
 
                Rooms.global.lockdown = true;
                for (var id in Rooms.rooms) {
                        if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-red\"><b>The server is restarting soon.</b><br />Please finish your battles quickly. No new battles can be started until the server resets in a few minutes.</div>");
                        if (Rooms.rooms[id].requestKickInactive && !Rooms.rooms[id].battle.ended) Rooms.rooms[id].requestKickInactive(user, true);
                }
 
                this.logEntry(user.name + " used /lockdown");
 
        },
 
        endlockdown: function (target, room, user) {
                if (!this.can('lockdown')) return false;
 
                if (!Rooms.global.lockdown) {
                        return this.sendReply("We're not under lockdown right now.");
                }
                Rooms.global.lockdown = false;
                for (var id in Rooms.rooms) {
                        if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-green\"><b>The server shutdown was canceled.</b></div>");
                }
 
                this.logEntry(user.name + " used /endlockdown");
 
        },
 
        emergency: function (target, room, user) {
                if (!this.can('lockdown')) return false;
 
                if (Config.emergency) {
                        return this.sendReply("We're already in emergency mode.");
                }
                Config.emergency = true;
                for (var id in Rooms.rooms) {
                        if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-red\">The server has entered emergency mode. Some features might be disabled or limited.</div>");
                }
 
                this.logEntry(user.name + " used /emergency");
        },
 
        endemergency: function (target, room, user) {
                if (!this.can('lockdown')) return false;
 
                if (!Config.emergency) {
                        return this.sendReply("We're not in emergency mode.");
                }
                Config.emergency = false;
                for (var id in Rooms.rooms) {
                        if (id !== 'global') Rooms.rooms[id].addRaw("<div class=\"broadcast-green\"><b>The server is no longer in emergency mode.</b></div>");
                }
 
                this.logEntry(user.name + " used /endemergency");
        },
 
        kill: function (target, room, user) {
                if (!this.can('lockdown')) return false;
 
                if (!Rooms.global.lockdown) {
                        return this.sendReply("For safety reasons, /kill can only be used during lockdown.");
                }
 
                if (CommandParser.updateServerLock) {
                        return this.sendReply("Wait for /updateserver to finish before using /kill.");
                }
 
                /*for (var i in Sockets.workers) {
                        Sockets.workers[i].kill();
                }*/
 
                if (!room.destroyLog) {
                        process.exit();
                        return;
                }
                room.destroyLog(function () {
                        room.logEntry(user.name + " used /kill");
                }, function () {
                        process.exit();
                });
 
                // Just in the case the above never terminates, kill the process
                // after 10 seconds.
                setTimeout(function () {
                        process.exit();
                }, 10000);
        },
 
        loadbanlist: function (target, room, user, connection) {
                if (!this.can('hotpatch')) return false;
 
                connection.sendTo(room, "Loading ipbans.txt...");
                fs.readFile('config/ipbans.txt', function (err, data) {
                        if (err) return;
                        data = ('' + data).split('\n');
                        var rangebans = [];
                        for (var i = 0; i < data.length; ++i) {
                                var line = data[i].split('#')[0].trim();
                                if (!line) continue;
                                if (line.indexOf('/') >= 0) {
                                        rangebans.push(line);
                                } else if (line && !Users.bannedIps[line]) {
                                        Users.bannedIps[line] = '#ipban';
                                }
                        }
                        Users.checkRangeBanned = Cidr.checker(rangebans);
                        connection.sendTo(room, "ibans.txt has been reloaded.");
                });
        },
 
        refreshpage: function (target, room, user) {
                if (!this.can('hotpatch')) return false;
                Rooms.global.send('|refresh|');
                this.logEntry(user.name + " used /refreshpage");
        },
 
        updateserver: function (target, room, user, connection) {
                if (!user.hasConsoleAccess(connection)) {
                        return this.sendReply("/updateserver - Access denied.");
                }
 
                if (CommandParser.updateServerLock) {
                        return this.sendReply("/updateserver - Another update is already in progress.");
                }
 
                CommandParser.updateServerLock = true;
 
                var logQueue = [];
                logQueue.push(user.name + " used /updateserver");
 
                connection.sendTo(room, "updating...");
 
                var exec = require('child_process').exec;
                exec('git diff-index --quiet HEAD --', function (error) {
                        var cmd = 'git pull --rebase';
                        if (error) {
                                if (error.code === 1) {
                                        // The working directory or index have local changes.
                                        cmd = 'git stash && ' + cmd + ' && git stash pop';
                                } else {
                                        // The most likely case here is that the user does not have
                                        // `git` on the PATH (which would be error.code === 127).
                                        connection.sendTo(room, "" + error);
                                        logQueue.push("" + error);
                                        logQueue.forEach(function (line) {
                                                room.logEntry(line);
                                        });
                                        CommandParser.updateServerLock = false;
                                        return;
                                }
                        }
                        var entry = "Running `" + cmd + "`";
                        connection.sendTo(room, entry);
                        logQueue.push(entry);
                        exec(cmd, function (error, stdout, stderr) {
                                ("" + stdout + stderr).split("\n").forEach(function (s) {
                                        connection.sendTo(room, s);
                                        logQueue.push(s);
                                });
                                logQueue.forEach(function (line) {
                                        room.logEntry(line);
                                });
                                CommandParser.updateServerLock = false;
                        });
                });
        },
 
        crashfixed: function (target, room, user) {
                if (!Rooms.global.lockdown) {
                        return this.sendReply('/crashfixed - There is no active crash.');
                }
                if (!this.can('hotpatch')) return false;
 
                Rooms.global.lockdown = false;
                if (Rooms.lobby) {
                        Rooms.lobby.modchat = false;
                        Rooms.lobby.addRaw("<div class=\"broadcast-green\"><b>We fixed the crash without restarting the server!</b><br />You may resume talking in the lobby and starting new battles.</div>");
                }
                this.logEntry(user.name + " used /crashfixed");
        },
 
        'memusage': 'memoryusage',
        memoryusage: function (target) {
                if (!this.can('hotpatch')) return false;
                target = toId(target) || 'all';
                if (target === 'all') {
                        this.sendReply("Loading memory usage, this might take a while.");
                }
                if (target === 'all' || target === 'rooms' || target === 'room') {
                        this.sendReply("Calculating Room size...");
                        var roomSize = ResourceMonitor.sizeOfObject(Rooms);
                        this.sendReply("Rooms are using " + roomSize + " bytes of memory.");
                }
                if (target === 'all' || target === 'config') {
                        this.sendReply("Calculating config size...");
                        var configSize = ResourceMonitor.sizeOfObject(Config);
                        this.sendReply("Config is using " + configSize + " bytes of memory.");
                }
                if (target === 'all' || target === 'resourcemonitor' || target === 'rm') {
                        this.sendReply("Calculating Resource Monitor size...");
                        var rmSize = ResourceMonitor.sizeOfObject(ResourceMonitor);
                        this.sendReply("The Resource Monitor is using " + rmSize + " bytes of memory.");
                }
                if (target === 'all' || target === 'cmdp' || target === 'cp' || target === 'commandparser') {
                        this.sendReply("Calculating Command Parser size...");
                        var cpSize = ResourceMonitor.sizeOfObject(CommandParser);
                        this.sendReply("Command Parser is using " + cpSize + " bytes of memory.");
                }
                if (target === 'all' || target === 'sim' || target === 'simulator') {
                        this.sendReply("Calculating Simulator size...");
                        var simSize = ResourceMonitor.sizeOfObject(Simulator);
                        this.sendReply("Simulator is using " + simSize + " bytes of memory.");
                }
                if (target === 'all' || target === 'users') {
                        this.sendReply("Calculating Users size...");
                        var usersSize = ResourceMonitor.sizeOfObject(Users);
                        this.sendReply("Users is using " + usersSize + " bytes of memory.");
                }
                if (target === 'all' || target === 'tools') {
                        this.sendReply("Calculating Tools size...");
                        var toolsSize = ResourceMonitor.sizeOfObject(Tools);
                        this.sendReply("Tools are using " + toolsSize + " bytes of memory.");
                }
                if (target === 'all' || target === 'v8') {
                        this.sendReply("Retrieving V8 memory usage...");
                        var o = process.memoryUsage();
                        this.sendReply(
                                "Resident set size: " + o.rss + ", " + o.heapUsed + " heap used of " + o.heapTotal  + " total heap. "
                                 + (o.heapTotal - o.heapUsed) + " heap left."
                        );
                        delete o;
                }
                if (target === 'all') {
                        this.sendReply("Calculating Total size...");
                        var total = (roomSize + configSize + rmSize + cpSize + simSize + toolsSize + usersSize) || 0;
                        var units = ["bytes", "K", "M", "G"];
                        var converted = total;
                        var unit = 0;
                        while (converted > 1024) {
                                converted /= 1024;
                                ++unit;
                        }
                        converted = Math.round(converted);
                        this.sendReply("Total memory used: " + converted + units[unit] + " (" + total + " bytes).");
                }
                return;
        },
 
        bash: function (target, room, user, connection) {
                if (!user.hasConsoleAccess(connection)) {
                        return this.sendReply("/bash - Access denied.");
                }
 
                var exec = require('child_process').exec;
                exec(target, function (error, stdout, stderr) {
                        connection.sendTo(room, ("" + stdout + stderr));
                });
        },
 
        eval: function (target, room, user, connection, cmd, message) {
                if (!user.hasConsoleAccess(connection)) {
                        return this.sendReply("/eval - Access denied.");
                }
                if (!this.canBroadcast()) return;
 
                if (!this.broadcasting) this.sendReply('||>> ' + target);
                try {
                        var battle = room.battle;
                        var me = user;
                        this.sendReply('||<< ' + eval(target));
                } catch (e) {
                        this.sendReply('||<< error: ' + e.message);
                        var stack = '||' + ('' + e.stack).replace(/\n/g, '\n||');
                        connection.sendTo(room, stack);
                }
        },
 
        evalbattle: function (target, room, user, connection, cmd, message) {
                if (!user.hasConsoleAccess(connection)) {
                        return this.sendReply("/evalbattle - Access denied.");
                }
                if (!this.canBroadcast()) return;
                if (!room.battle) {
                        return this.sendReply("/evalbattle - This isn't a battle room.");
                }
 
                room.battle.send('eval', target.replace(/\n/g, '\f'));
        },
 
        /*********************************************************
         * Battle commands
         *********************************************************/
 
        forfeit: function (target, room, user) {
                if (!room.battle) {
                        return this.sendReply("There's nothing to forfeit here.");
                }
                if (!room.forfeit(user)) {
                        return this.sendReply("You can't forfeit this battle.");
                }
        },
 
        savereplay: function (target, room, user, connection) {
                if (!room || !room.battle) return;
                var logidx = 2; // spectator log (no exact HP)
                if (room.battle.ended) {
                        // If the battle is finished when /savereplay is used, include
                        // exact HP in the replay log.
                        logidx = 3;
                }
                var data = room.getLog(logidx).join("\n");
                var datahash = crypto.createHash('md5').update(data.replace(/[^(\x20-\x7F)]+/g, '')).digest('hex');
 
                LoginServer.request('prepreplay', {
                        id: room.id.substr(7),
                        loghash: datahash,
                        p1: room.p1.name,
                        p2: room.p2.name,
                        format: room.format
                }, function (success) {
                        if (success && success.errorip) {
                                connection.popup("This server's request IP " + success.errorip + " is not a registered server.");
                                return;
                        }
                        connection.send('|queryresponse|savereplay|' + JSON.stringify({
                                log: data,
                                id: room.id.substr(7)
                        }));
                });
        },
 
        mv: 'move',
        attack: 'move',
        move: function (target, room, user) {
                if (!room.decision) return this.sendReply("You can only do this in battle rooms.");
 
                room.decision(user, 'choose', 'move ' + target);
        },
 
        sw: 'switch',
        switch: function (target, room, user) {
                if (!room.decision) return this.sendReply("You can only do this in battle rooms.");
 
                room.decision(user, 'choose', 'switch ' + parseInt(target, 10));
        },
 
        choose: function (target, room, user) {
                if (!room.decision) return this.sendReply("You can only do this in battle rooms.");
 
                room.decision(user, 'choose', target);
        },
 
        undo: function (target, room, user) {
                if (!room.decision) return this.sendReply("You can only do this in battle rooms.");
 
                room.decision(user, 'undo', target);
        },
 
        team: function (target, room, user) {
                if (!room.decision) return this.sendReply("You can only do this in battle rooms.");
 
                room.decision(user, 'choose', 'team ' + target);
        },
 
        joinbattle: function (target, room, user) {
                if (!room.joinBattle) return this.sendReply("You can only do this in battle rooms.");
                if (!user.can('joinbattle', null, room)) return this.popupReply("You must be a roomvoice to join a battle you didn't start. Ask a player to use /roomvoice on you to join this battle.");
 
                room.joinBattle(user);
        },
 
        partbattle: 'leavebattle',
        leavebattle: function (target, room, user) {
                if (!room.leaveBattle) return this.sendReply("You can only do this in battle rooms.");
 
                room.leaveBattle(user);
        },
 
        kickbattle: function (target, room, user) {
                if (!room.leaveBattle) return this.sendReply("You can only do this in battle rooms.");
 
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser || !targetUser.connected) {
                        return this.sendReply("User " + this.targetUsername + " not found.");
                }
                if (!this.can('kick', targetUser)) return false;
 
                if (room.leaveBattle(targetUser)) {
                        this.addModCommand("" + targetUser.name + " was kicked from a battle by " + user.name + (target ? " (" + target + ")" : ""));
                } else {
                        this.sendReply("/kickbattle - User isn't in battle.");
                }
        },
 
        kickinactive: function (target, room, user) {
                if (room.requestKickInactive) {
                        room.requestKickInactive(user);
                } else {
                        this.sendReply("You can only kick inactive players from inside a room.");
                }
        },
 
        timer: function (target, room, user) {
                target = toId(target);
                if (room.requestKickInactive) {
                        if (target === 'off' || target === 'false' || target === 'stop') {
                                room.stopKickInactive(user, user.can('timer'));
                        } else if (target === 'on' || target === 'true' || !target) {
                                room.requestKickInactive(user, user.can('timer'));
                        } else {
                                this.sendReply("'" + target + "' is not a recognized timer state.");
                        }
                } else {
                        this.sendReply("You can only set the timer from inside a room.");
                }
        },
 
        autotimer: 'forcetimer',
        forcetimer: function (target, room, user) {
                target = toId(target);
                if (!this.can('autotimer')) return;
                if (target === 'off' || target === 'false' || target === 'stop') {
                        Config.forcetimer = false;
                        this.addModCommand("Forcetimer is now OFF: The timer is now opt-in. (set by " + user.name + ")");
                } else if (target === 'on' || target === 'true' || !target) {
                        Config.forcetimer = true;
                        this.addModCommand("Forcetimer is now ON: All battles will be timed. (set by " + user.name + ")");
                } else {
                        this.sendReply("'" + target + "' is not a recognized forcetimer setting.");
                }
        },
 
        forcetie: 'forcewin',
        forcewin: function (target, room, user) {
                if (!this.can('forcewin')) return false;
                if (!room.battle) {
                        this.sendReply("/forcewin - This is not a battle room.");
                        return false;
                }
 
                room.battle.endType = 'forced';
                if (!target) {
                        room.battle.tie();
                        this.logModCommand(user.name + " forced a tie.");
                        return false;
                }
                target = Users.get(target);
                if (target) target = target.userid;
                else target = '';
 
                if (target) {
                        room.battle.win(target);
                        this.logModCommand(user.name + " forced a win for " + target + ".");
                }
 
        },
 
        /*********************************************************
         * Challenging and searching commands
         *********************************************************/
 
        cancelsearch: 'search',
        search: function (target, room, user) {
                if (target) {
                        if (Config.pmmodchat) {
                                var userGroup = user.group;
                                if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
                                        var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
                                        this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to search for a battle.");
                                        return false;
                                }
                        }
                        Rooms.global.searchBattle(user, target);
                } else {
                        Rooms.global.cancelSearch(user);
                }
        },
 
        chall: 'challenge',
        challenge: function (target, room, user, connection) {
                target = this.splitTarget(target);
                var targetUser = this.targetUser;
                if (!targetUser || !targetUser.connected) {
                        return this.popupReply("The user '" + this.targetUsername + "' was not found.");
                }
                if (targetUser.blockChallenges && !user.can('bypassblocks', targetUser)) {
                        return this.popupReply("The user '" + this.targetUsername + "' is not accepting challenges right now.");
                }
                if (Config.pmmodchat) {
                        var userGroup = user.group;
                        if (Config.groupsranking.indexOf(userGroup) < Config.groupsranking.indexOf(Config.pmmodchat)) {
                                var groupName = Config.groups[Config.pmmodchat].name || Config.pmmodchat;
                                this.popupReply("Because moderated chat is set, you must be of rank " + groupName + " or higher to challenge users.");
                                return false;
                        }
                }
                user.prepBattle(target, 'challenge', connection, function (result) {
                        if (result) user.makeChallenge(targetUser, target);
                });
        },
 
        idle: 'blockchallenges',
        blockchallenges: function (target, room, user) {
                user.blockChallenges = true;
                this.sendReply("You are now blocking all incoming challenge requests.");
        },
 
        allowchallenges: function (target, room, user) {
                user.blockChallenges = false;
                this.sendReply("You are available for challenges from now on.");
        },
 
        cchall: 'cancelChallenge',
        cancelchallenge: function (target, room, user) {
                user.cancelChallengeTo(target);
        },
 
        accept: function (target, room, user, connection) {
                var userid = toId(target);
                var format = '';
                if (user.challengesFrom[userid]) format = user.challengesFrom[userid].format;
                if (!format) {
                        this.popupReply(target + " cancelled their challenge before you could accept it.");
                        return false;
                }
                user.prepBattle(format, 'challenge', connection, function (result) {
                        if (result) user.acceptChallengeFrom(userid);
                });
        },
 
        reject: function (target, room, user) {
                user.rejectChallengeFrom(toId(target));
        },
 
        saveteam: 'useteam',
        utm: 'useteam',
        useteam: function (target, room, user) {
                user.team = target;
        },
 
        /*********************************************************
         * Low-level
         *********************************************************/
 
        cmd: 'query',
        query: function (target, room, user, connection) {
                // Avoid guest users to use the cmd errors to ease the app-layer attacks in emergency mode
                var trustable = (!Config.emergency || (user.named && user.authenticated));
                if (Config.emergency && ResourceMonitor.countCmd(connection.ip, user.name)) return false;
                var spaceIndex = target.indexOf(' ');
                var cmd = target;
                if (spaceIndex > 0) {
                        cmd = target.substr(0, spaceIndex);
                        target = target.substr(spaceIndex + 1);
                } else {
                        target = '';
                }
                if (cmd === 'userdetails') {
 
                        var targetUser = Users.get(target);
                        if (!trustable || !targetUser) {
                                connection.send('|queryresponse|userdetails|' + JSON.stringify({
                                        userid: toId(target),
                                        rooms: false
                                }));
                                return false;
                        }
                        var roomList = {};
                        for (var i in targetUser.roomCount) {
                                if (i === 'global') continue;
                                var targetRoom = Rooms.get(i);
                                if (!targetRoom || targetRoom.isPrivate) continue;
                                var roomData = {};
                                if (targetRoom.battle) {
                                        var battle = targetRoom.battle;
                                        roomData.p1 = battle.p1 ? ' ' + battle.p1 : '';
                                        roomData.p2 = battle.p2 ? ' ' + battle.p2 : '';
                                }
                                roomList[i] = roomData;
                        }
                        if (!targetUser.roomCount['global']) roomList = false;
                        var userdetails = {
                                userid: targetUser.userid,
                                avatar: targetUser.avatar,
                                rooms: roomList
                        };
                        if (user.can('ip', targetUser)) {
                                var ips = Object.keys(targetUser.ips);
                                if (ips.length === 1) {
                                        userdetails.ip = ips[0];
                                } else {
                                        userdetails.ips = ips;
                                }
                        }
                        connection.send('|queryresponse|userdetails|' + JSON.stringify(userdetails));
 
                } else if (cmd === 'roomlist') {
                        if (!trustable) return false;
                        connection.send('|queryresponse|roomlist|' + JSON.stringify({
                                rooms: Rooms.global.getRoomList(true)
                        }));
 
                } else if (cmd === 'rooms') {
                        if (!trustable) return false;
                        connection.send('|queryresponse|rooms|' + JSON.stringify(
                                Rooms.global.getRooms()
                        ));
 
                }
        },
 
        trn: function (target, room, user, connection) {
                var commaIndex = target.indexOf(',');
                var targetName = target;
                var targetAuth = false;
                var targetToken = '';
                if (commaIndex >= 0) {
                        targetName = target.substr(0, commaIndex);
                        target = target.substr(commaIndex + 1);
                        commaIndex = target.indexOf(',');
                        targetAuth = target;
                        if (commaIndex >= 0) {
                                targetAuth = !!parseInt(target.substr(0, commaIndex), 10);
                                targetToken = target.substr(commaIndex + 1);
                        }
                }
                user.rename(targetName, targetToken, targetAuth, connection);
        },
 
};
 function outputToConsole(text) {
                var p = Y.Node.create("<p>" + text + "</p>");
                Y.one("#out").append(p);
                p.scrollIntoView();
            }
