// src/utils/securityConfig.js
const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'securityConfig.json');
const LOGS_FILE = path.join(__dirname, '..', '..', 'securityLogs.json');
const WHITELIST_FILE = path.join(__dirname, '..', '..', 'whitelist.json');
const WRITE_DEBOUNCE_MS = 5000;

let configCache = {};
let logsCache = {};
let whitelistCache = {};
let writePending = false;
let logsWritePending = false;
let whitelistWritePending = false;

const DEFAULT_CONFIG = {
    enabled: true,
    logChannelId: '1474490344380043486',
    
    // Anti-nuke settings
    antinuke: {
        enabled: true,
        maxRoleChanges: 3, // Max role changes in 10 seconds
        maxChannelChanges: 3, // Max channel creates/deletes in 10 seconds
        maxKicks: 2, // Max kicks in 10 seconds
        maxBans: 2, // Max bans in 10 seconds
        maxPermissionChanges: 2, // Max permission changes in 10 seconds
        timeWindow: 10000, // 10 seconds
        autoPunish: true, // Auto-remove roles from offenders
    },
    
    // Anti-raid settings
    antiraid: {
        enabled: true,
        maxJoins: 5, // Max joins in 10 seconds
        joinWindow: 10000, // 10 seconds
        autoLock: true, // Auto-lock channels when raid detected
        lockDuration: 300000, // 5 minutes
    },
    
    // Role protection settings
    roleProtection: {
        enabled: true,
        protectedRoles: [], // Role IDs that cannot be modified by non-whitelisted
        adminRoleIds: [], // Roles that have admin perms (to watch)
        maxSelfRoleGrants: 2, // Max roles a user can grant themselves in 10 seconds
        notifyOnAdminGrant: true, // Notify when admin perms are granted
        maxRapidRoleChanges: 4,
        positionJumpThreshold: 5,
        roleRiskScoreThreshold: 12
    },

    webhookProtection: {
        enabled: true,
        spikeThreshold: 3,
        spamMessageThreshold: 15,
        usageWindowMs: 20000,
        repeatSpamThreshold: 4,
        mentionSpamThreshold: 3,
        mentionSpamRepeatThreshold: 2
    },
    
    // Spam protection (existing)
    spam: {
        enabled: true,
        enhancedEnabled: true,
        warnThreshold: 5,
        timeout1Threshold: 10,
        timeout2Threshold: 15,
        resetSeconds: 10,
        burstWindow: 5000,
        burstThreshold: 8,
        repeatContentThreshold: 3,
        mentionThreshold: 4,
        mentionRepeatThreshold: 2
    }
};

async function load() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = JSON.parse(data);
    } catch (err) {
        if (err.code !== 'ENOENT') console.error('❌ Error loading security config:', err);
        configCache = {};
    }
    
    try {
        const data = await fs.readFile(LOGS_FILE, 'utf8');
        logsCache = JSON.parse(data);
    } catch (err) {
        if (err.code !== 'ENOENT') console.error('❌ Error loading security logs:', err);
        logsCache = { actions: [] };
    }
    
    try {
        const data = await fs.readFile(WHITELIST_FILE, 'utf8');
        whitelistCache = JSON.parse(data);
    } catch (err) {
        if (err.code !== 'ENOENT') console.error('❌ Error loading whitelist:', err);
        whitelistCache = { users: [], roles: [] };
    }
}

async function scheduleWrite() {
    if (writePending) return;
    writePending = true;
    setTimeout(async () => {
        try {
            await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2), 'utf8');
        } catch (err) {
            console.error('❌ Error saving security config:', err);
        } finally {
            writePending = false;
        }
    }, WRITE_DEBOUNCE_MS);
}

async function scheduleLogsWrite() {
    if (logsWritePending) return;
    logsWritePending = true;
    setTimeout(async () => {
        try {
            await fs.writeFile(LOGS_FILE, JSON.stringify(logsCache, null, 2), 'utf8');
        } catch (err) {
            console.error('❌ Error saving security logs:', err);
        } finally {
            logsWritePending = false;
        }
    }, WRITE_DEBOUNCE_MS);
}

async function scheduleWhitelistWrite() {
    if (whitelistWritePending) return;
    whitelistWritePending = true;
    setTimeout(async () => {
        try {
            await fs.writeFile(WHITELIST_FILE, JSON.stringify(whitelistCache, null, 2), 'utf8');
        } catch (err) {
            console.error('❌ Error saving whitelist:', err);
        } finally {
            whitelistWritePending = false;
        }
    }, WRITE_DEBOUNCE_MS);
}

async function get(guildId) {
    const config = configCache[guildId];
    if (config) return { ...DEFAULT_CONFIG, ...config };
    return { ...DEFAULT_CONFIG };
}

async function update(guildId, partial) {
    const current = await get(guildId);
    configCache[guildId] = { ...current, ...partial };
    await scheduleWrite();
}

async function getWhitelist(guildId) {
    return whitelistCache[guildId] || { users: [], roles: [] };
}

async function updateWhitelist(guildId, data) {
    whitelistCache[guildId] = data;
    await scheduleWhitelistWrite();
}

async function isWhitelisted(guildId, userId, memberRoles) {
    const whitelist = await getWhitelist(guildId);
    
    // Check if user is whitelisted
    if (whitelist.users.includes(userId)) return true;
    
    // Check if user has any whitelisted roles
    for (const roleId of whitelist.roles) {
        if (memberRoles.includes(roleId)) return true;
    }
    
    return false;
}

async function addActionLog(guildId, action) {
    if (!logsCache[guildId]) logsCache[guildId] = [];
    logsCache[guildId].push({
        ...action,
        timestamp: Date.now()
    });
    
    // Keep only last 1000 actions
    if (logsCache[guildId].length > 1000) {
        logsCache[guildId] = logsCache[guildId].slice(-1000);
    }
    
    await scheduleLogsWrite();
}

async function getActionLogs(guildId, minutes = 5) {
    if (!logsCache[guildId]) return [];
    const cutoff = Date.now() - (minutes * 60000);
    return logsCache[guildId].filter(log => log.timestamp > cutoff);
}

// Initialize on load
load().catch(console.error);

module.exports = {
    get,
    update,
    getWhitelist,
    updateWhitelist,
    isWhitelisted,
    addActionLog,
    getActionLogs
};