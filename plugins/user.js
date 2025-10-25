const {
    bot,
    isAdmin,
    getRandom,
    forward,
    mentionJid
} = require('../lib/')
const Config = require('../config')

// Fallback language strings
const lang = {
    NOT_GROUP: "_This command can only be used in a group_",
    NOT_ADMIN: "_Bot is not admin. Please promote the bot to admin._",
    ERROR_METADATA: "_Failed to fetch group metadata_",
    TAG_ALERT: "_Reply to a message or provide text to tag_",
    TAGALL_DESC: "Tag all group members",
    TAG_DESC: "Tag all members with a message",
    ADD_ALERT: "_Provide a number or reply to a message to add_",
    ADD_DESC: "Add a user to the group",
    ADDED: "_Added @{} to the group_",
    KICK_ALERT: "_Provide a number or reply to a message to kick_",
    KICK_DESC: "Kick a user from the group",
    KICKED: "_Kicked @{} from the group_",
    KICK_ERROR: "_Failed to kick user: {}_",
    PROMOTE_ALERT: "_Provide a number or reply to a message to promote_",
    PROMOTE_DESC: "Promote a user to admin",
    PROMOTED: "_Promoted @{} to admin_",
    ALREADY_PROMOTED: "_User is already an admin_",
    PROMOTE_ERROR: "_Failed to promote user: {}_",
    DEMOTE_ALERT: "_Provide a number or reply to a message to demote_",
    DEMOTE_DESC: "Demote a user from admin",
    DEMOTED: "_Demoted @{} from admin_",
    ALREADY_DEMOTED: "_User is not an admin_",
    DEMOTE_ERROR: "_Failed to demote user: {}_",
    MUTE_DESC: "Mute the group",
    MUTED: "_Group muted_",
    UNMUTE_DESC: "Unmute the group",
    UNMUTED: "_Group unmuted_",
    GLOCK_DESC: "Lock the group (only admins can send messages)",
    GLOCKED: "_Group locked_",
    GUNLOCK_DESC: "Unlock the group",
    GUNLOCKED: "_Group unlocked_",
    INVITE_DESC: "Get the group invite link",
    INVITE: "_Invite link: {}_",
    INVITE_ERROR: "_Failed to get invite link: {}_",
    REVOKE_DESC: "Revoke the group invite link",
    REVOKED: "_Group invite link revoked_",
    REVOKE_ERROR: "_Failed to revoke invite link: {}_",
    GNAME_DESC: "Change the group name",
    GNAME_ALERT: "_Provide a new group name_",
    GNAME_SUCCESS: "_Group name changed to {}_",
    GDESC_DESC: "Change the group description",
    GDESC_ALERT: "_Provide a new group description_",
    GDESC_SUCCESS: "_Group description changed to {}_",
    JOINREQUESTS_DESC: "View or manage group join requests",
    JOINREQUESTS_NULL: "_No join requests found_",
    JOINREQUESTS_FOUND: "_Join requests:_\n{}",
    JOINREQUESTS_APPROVING: "_Approving {} join requests_",
    JOINREQUESTS_REJECTING: "_Rejecting {} join requests_",
    JOINREQUESTS_INVAILD_PARAMS: "_Invalid parameters. Use 'approve all' or 'reject all'_",
    LEAVE_DESC: "Make the bot leave the group",
    LEAVE_MSG: "_Leaving group_",
    REMOVEGPP_DESC: "Remove the group profile picture",
    REMOVEGPP_SUCCESS: "_Group profile picture removed_",
    GPP_DESC: "Set or get the group profile picture",
    GPP_ALERT: "_Reply to an image or provide an image URL_",
    GPP_NOTIMAGE: "_Replied message is not an image_",
    GPP_SUCCESS: "_Group profile picture updated_",
    GPP_FAILED: "_Failed to update group profile picture_"
}

// Updated debugIsAdmin with simplified LID resolution
async function debugIsAdmin(message, userJid) {
    try {
        const metadata = await message.client.groupMetadata(message.jid);
        const admins = metadata.participants
            .filter(e => e.admin)
            .map(e => e.id);

        console.log(`[DEBUG] Group JID: ${message.jid}`);
        console.log(`[DEBUG] Checking admin for user: ${userJid}`);
        console.log(`[DEBUG] Admin list: ${JSON.stringify(admins)}`);

        // Check if userJid is directly in the admin list
        if (admins.includes(userJid)) {
            console.log(`[DEBUG] Direct match for JID: ${userJid}`);
            return true;
        }

        // If LID resolution is available, check for LID match
        if (message.client.getPNFromLID) {
            for (const adminId of admins) {
                if (adminId.endsWith('@lid')) {
                    try {
                        const resolvedNumber = await message.client.getPNFromLID(adminId);
                        const resolvedJid = resolvedNumber ? `${resolvedNumber}@s.whatsapp.net` : null;
                        console.log(`[DEBUG] Resolved LID ${adminId} to JID: ${resolvedJid || 'null'}`);
                        if (resolvedJid === userJid) {
                            console.log(`[DEBUG] LID ${adminId} matches user JID: ${userJid}`);
                            return true;
                        }
                    } catch (error) {
                        console.error(`[DEBUG] LID resolution failed for ${adminId}: ${error.message}`);
                    }
                }
            }
        }

        console.log(`[DEBUG] IsAdmin result: false`);
        return false;
    } catch (error) {
        console.error(`[ERROR] debugIsAdmin failed: ${error.message}`);
        return false;
    }
}

// Fallback for formatNumberToJid
async function formatNumberToJid(number) {
    if (!number) return null;
    const cleaned = number.replace(/[^0-9]/g, '');
    return cleaned + '@s.whatsapp.net';
}

// Attempt to resolve JID to LID for participant-related commands
async function resolveJidToLid(client, jid, groupJid) {
    try {
        const phoneNumber = jid.split('@')[0];
        const groupMetadata = await client.groupMetadata(groupJid);
        const participant = groupMetadata.participants.find(p => p.id.includes(phoneNumber) || p.id === jid);
        if (participant && participant.id.endsWith('@lid')) {
            console.log(`[DEBUG] Resolved JID ${jid} to LID: ${participant.id}`);
            return participant.id;
        }
        console.log(`[DEBUG] No LID found for JID ${jid}, using original JID`);
        return jid;
    } catch (error) {
        console.error(`[DEBUG] Failed to resolve JID ${jid} to LID: ${error.message}`);
        return jid;
    }
}

// Tag all members with a message
bot({
    pattern: 'tag ?(.*)',
    fromMe: true,
    desc: lang.TAG_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    match = match || message.reply_message;
    if (!match) return await message.reply(lang.TAG_ALERT);
    const groupMetadata = await client.groupMetadata(message.jid);
    const jids = groupMetadata.participants.map(p => p.id);
    const content = typeof match === 'string' ? match : message.reply_message.text;
    return await client.sendMessage(message.jid, {
        text: content,
        mentions: jids
    }, { quoted: message.data });
});

// Tag all group members
bot({
    pattern: 'tagall',
    fromMe: true,
    desc: lang.TAGALL_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const { participants } = await client.groupMetadata(message.jid).catch(() => ({ participants: [] }));
    if (!participants.length) return await message.reply(lang.ERROR_METADATA);
    const msg = participants.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n');
    const jids = participants.map(p => p.id);
    return await client.sendMessage(message.jid, {
        text: msg,
        mentions: jids
    }, { quoted: message.data });
});

// Add a user to the group
bot({
    pattern: 'add ?(.*)',
    fromMe: true,
    desc: lang.ADD_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    match = match || message.reply_message;
    if (!match) return await message.reply(lang.ADD_ALERT);
    let jid = message.reply_message ? message.reply_message.sender : await formatNumberToJid(match);
    if (!jid) return await message.reply(lang.ADD_ALERT);
    try {
        await client.groupParticipantsUpdate(message.jid, [jid], 'add');
        return await client.sendMessage(message.jid, {
            text: lang.ADDED.replace('{}', `@${jid.split('@')[0]}`),
            mentions: [jid]
        }, { quoted: message.data });
    } catch (error) {
        console.error(`[ERROR] Add failed: ${error.message}`);
        return await message.reply(lang.ADD_ALERT.replace('{}', error.message));
    }
});

// Kick a user from the group
bot({
    pattern: 'kick ?(.*)',
    fromMe: true,
    desc: lang.KICK_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    match = match || message.reply_message;
    if (!match) return await message.reply(lang.KICK_ALERT);
    let jid = message.reply_message ? message.reply_message.sender : await formatNumberToJid(match);
    if (!jid) return await message.reply(lang.KICK_ALERT);

    try {
        const resolvedJid = await resolveJidToLid(client, jid, message.jid);
        console.log(`[DEBUG] Kicking user: ${resolvedJid}`);
        await client.groupParticipantsUpdate(message.jid, [resolvedJid], 'remove');
        return await client.sendMessage(message.jid, {
            text: lang.KICKED.replace('{}', `@${resolvedJid.split('@')[0]}`),
            mentions: [resolvedJid]
        }, { quoted: message.data });
    } catch (error) {
        console.error(`[ERROR] Kick failed: ${error.message}`);
        return await message.reply(lang.KICK_ERROR.replace('{}', error.message));
    }
});

// Promote a user to admin
bot({
    pattern: 'promote ?(.*)',
    fromMe: true,
    desc: lang.PROMOTE_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    match = match || message.reply_message;
    if (!match) return await message.reply(lang.PROMOTE_ALERT);
    let jid = message.reply_message ? message.reply_message.sender : await formatNumberToJid(match);
    if (!jid) return await message.reply(lang.PROMOTE_ALERT);

    try {
        const resolvedJid = await resolveJidToLid(client, jid, message.jid);
        console.log(`[DEBUG] Promoting user: ${resolvedJid}`);
        const isAlreadyAdmin = await debugIsAdmin(message, resolvedJid);
        console.log(`[DEBUG] Is user ${resolvedJid} already admin? ${isAlreadyAdmin}`);
        if (isAlreadyAdmin) return await message.reply(lang.ALREADY_PROMOTED);
        await client.groupParticipantsUpdate(message.jid, [resolvedJid], 'promote');
        return await client.sendMessage(message.jid, {
            text: lang.PROMOTED.replace('{}', `@${resolvedJid.split('@')[0]}`),
            mentions: [resolvedJid]
        }, { quoted: message.data });
    } catch (error) {
        console.error(`[ERROR] Promote failed: ${error.message}`);
        return await message.reply(lang.PROMOTE_ERROR.replace('{}', error.message));
    }
});

// Demote a user from admin
bot({
    pattern: 'demote ?(.*)',
    fromMe: true,
    desc: lang.DEMOTE_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    match = match || message.reply_message;
    if (!match) return await message.reply(lang.DEMOTE_ALERT);
    let jid = message.reply_message ? message.reply_message.sender : await formatNumberToJid(match);
    if (!jid) return await message.reply(lang.DEMOTE_ALERT);

    try {
        const resolvedJid = await resolveJidToLid(client, jid, message.jid);
        console.log(`[DEBUG] Demoting user: ${resolvedJid}`);
        const isAlreadyAdmin = await debugIsAdmin(message, resolvedJid);
        if (!isAlreadyAdmin) return await message.reply(lang.ALREADY_DEMOTED);
        await client.groupParticipantsUpdate(message.jid, [resolvedJid], 'demote');
        return await client.sendMessage(message.jid, {
            text: lang.DEMOTED.replace('{}', `@${resolvedJid.split('@')[0]}`),
            mentions: [resolvedJid]
        }, { quoted: message.data });
    } catch (error) {
        console.error(`[ERROR] Demote failed: ${error.message}`);
        return await message.reply(lang.DEMOTE_ERROR.replace('{}', error.message));
    }
});

// Mute the group
bot({
    pattern: 'mute',
    fromMe: true,
    desc: lang.MUTE_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        await client.groupSettingUpdate(message.jid, 'announcement');
        return await message.reply(lang.MUTED);
    } catch (error) {
        console.error(`[ERROR] Mute failed: ${error.message}`);
        return await message.reply(`_Failed to mute group: ${error.message}_`);
    }
});

// Unmute the group
bot({
    pattern: 'unmute',
    fromMe: true,
    desc: lang.UNMUTE_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        await client.groupSettingUpdate(message.jid, 'not_announcement');
        return await message.reply(lang.UNMUTED);
    } catch (error) {
        console.error(`[ERROR] Unmute failed: ${error.message}`);
        return await message.reply(`_Failed to unmute group: ${error.message}_`);
    }
});

// Lock the group (only admins can send messages)
bot({
    pattern: 'glock',
    fromMe: true,
    desc: lang.GLOCK_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        await client.groupSettingUpdate(message.jid, 'locked');
        return await message.reply(lang.GLOCKED);
    } catch (error) {
        console.error(`[ERROR] Glock failed: ${error.message}`);
        return await message.reply(`_Failed to lock group: ${error.message}_`);
    }
});

// Unlock the group
bot({
    pattern: 'gunlock',
    fromMe: true,
    desc: lang.GUNLOCK_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        await client.groupSettingUpdate(message.jid, 'unlocked');
        return await message.reply(lang.GUNLOCKED);
    } catch (error) {
        console.error(`[ERROR] Gunlock failed: ${error.message}`);
        return await message.reply(`_Failed to unlock group: ${error.message}_`);
    }
});

// Get group invite link
bot({
    pattern: 'invite',
    fromMe: true,
    desc: lang.INVITE_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        const code = await client.groupInviteCode(message.jid);
        return await message.reply(lang.INVITE.replace('{}', `https://chat.whatsapp.com/${code}`));
    } catch (error) {
        console.error(`[ERROR] Invite failed: ${error.message}`);
        return await message.reply(lang.INVITE_ERROR.replace('{}', error.message));
    }
});

// Revoke group invite link
bot({
    pattern: 'revoke',
    fromMe: true,
    desc: lang.REVOKE_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        await client.groupRevokeInvite(message.jid);
        return await message.reply(lang.REVOKED);
    } catch (error) {
        console.error(`[ERROR] Revoke failed: ${error.message}`);
        return await message.reply(lang.REVOKE_ERROR.replace('{}', error.message));
    }
});

// Change group name
bot({
    pattern: 'gname ?(.*)',
    fromMe: true,
    desc: lang.GNAME_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    if (!match) return await message.reply(lang.GNAME_ALERT);
    try {
        await client.groupUpdateSubject(message.jid, match);
        return await message.reply(lang.GNAME_SUCCESS.replace('{}', match));
    } catch (error) {
        console.error(`[ERROR] Gname failed: ${error.message}`);
        return await message.reply(`_Failed to change group name: ${error.message}_`);
    }
});

// Change group description
bot({
    pattern: 'gdesc ?(.*)',
    fromMe: true,
    desc: lang.GDESC_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    if (!match) return await message.reply(lang.GDESC_ALERT);
    try {
        await client.groupUpdateDescription(message.jid, match);
        return await message.reply(lang.GDESC_SUCCESS.replace('{}', match));
    } catch (error) {
        console.error(`[ERROR] Gdesc failed: ${error.message}`);
        return await message.reply(`_Failed to change group description: ${error.message}_`);
    }
});

// View or manage group join requests
bot({
    pattern: 'joinrequests ?(.*)',
    fromMe: true,
    desc: lang.JOINREQUESTS_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        const allJoinRequests = await client.groupRequestParticipantsList(message.jid);
        if (allJoinRequests.length === 0) {
            return await message.reply(lang.JOINREQUESTS_NULL);
        }
        if (match) {
            switch (match.toLowerCase()) {
                case 'approve all':
                    await message.reply(lang.JOINREQUESTS_APPROVING.replace('{}', allJoinRequests.length));
                    for (let i of allJoinRequests) {
                        await client.groupRequestParticipantsUpdate(message.jid, [i.jid], 'approve');
                        await new Promise(resolve => setTimeout(resolve, 900));
                    }
                    break;
                case 'reject all':
                    await message.reply(lang.JOINREQUESTS_REJECTING.replace('{}', allJoinRequests.length));
                    for (let i of allJoinRequests) {
                        await client.groupRequestParticipantsUpdate(message.jid, [i.jid], 'reject');
                        await new Promise(resolve => setTimeout(resolve, 900));
                    }
                    break;
                default:
                    return await message.reply(lang.JOINREQUESTS_INVAILD_PARAMS);
            }
            return;
        }
        const formattedList = allJoinRequests
            .map((item, index) => {
                const requestVia = item.request_method === 'linked_group_join' ? 'community' :
                                  item.request_method === 'invite_link' ? 'invite link' :
                                  `added by @${item.requestor?.split('@')[0] || 'unknown'}`;
                return `_${index + 1}. @${item.jid.split('@')[0]}_\n_• Request via: ${requestVia}_\n_• Requested time: ${new Date(parseInt(item.request_time) * 1000).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}_`;
            })
            .join('\n\n');
        const jids = allJoinRequests.map(i => i.jid);
        return await client.sendMessage(message.jid, {
            text: lang.JOINREQUESTS_FOUND.replace('{}', formattedList),
            mentions: jids
        }, { quoted: message.data });
    } catch (error) {
        console.error(`[ERROR] Joinrequests failed: ${error.message}`);
        return await message.reply(`_Failed to manage join requests: ${error.message}_`);
    }
});

// Make the bot leave the group
bot({
    pattern: 'leave',
    fromMe: true,
    desc: lang.LEAVE_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    try {
        await message.reply(lang.LEAVE_MSG);
        return await client.groupLeave(message.jid);
    } catch (error) {
        console.error(`[ERROR] Leave failed: ${error.message}`);
        return await message.reply(`_Failed to leave group: ${error.message}_`);
    }
});

// Remove group profile picture
bot({
    pattern: 'removegpp',
    fromMe: true,
    desc: lang.REMOVEGPP_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    try {
        await client.updateProfilePicture(message.jid, {});
        return await message.reply(lang.REMOVEGPP_SUCCESS);
    } catch (error) {
        console.error(`[ERROR] Removegpp failed: ${error.message}`);
        return await message.reply(`_Failed to remove group profile picture: ${error.message}_`);
    }
});

// Set or get group profile picture
bot({
    pattern: 'gpp ?(.*)',
    fromMe: true,
    desc: lang.GPP_DESC,
    type: 'group',
    onlyGroup: true
}, async (message, match, client) => {
    const botJid = client.user.id.split(':')[0] + '@s.whatsapp.net';
    const isImAdmin = await debugIsAdmin(message, botJid);
    if (!isImAdmin) return await message.reply(lang.NOT_ADMIN);

    match = match || message.reply_message;
    if (!match) return await message.reply(lang.GPP_ALERT);
    if (message.reply_message && !message.reply_message.image) return await message.reply(lang.GPP_NOTIMAGE);
    try {
        const image = message.reply_message ? await message.reply_message.toFile(await getRandom('.jpeg')) : { url: match };
        await client.updateProfilePicture(message.jid, { url: image });
        return await message.reply(lang.GPP_SUCCESS);
    } catch (error) {
        console.error(`[ERROR] Gpp failed: ${error.message}`);
        return await message.reply(lang.GPP_FAILED.replace('{}', error.message));
    }
});
