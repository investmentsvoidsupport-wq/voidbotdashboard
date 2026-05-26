// src/utils/creditSystem.js
const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

// ==================== USER CREDIT OPERATIONS ====================

async function getCredits(userId) {
  try {
    const doc = await db.collection('voidCredits').doc(userId).get();
    if (!doc.exists) {
      return {
        userId,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastMessageReward: null,
        messageCountThisWeek: 0,
        inviteCount: 0,
        boostCount: 0,
        dailyStreak: 0,
        lastDailyClaimDate: null,
        createdAt: new Date()
      };
    }
    return doc.data();
  } catch (error) {
    console.error('Error getting credits:', error);
    return null;
  }
}

async function addCredits(userId, amount, reason = 'unknown') {
  try {
    const userDoc = await getCredits(userId);
    const newBalance = (userDoc?.balance || 0) + amount;
    const newEarned = (userDoc?.totalEarned || 0) + amount;

    await db.collection('voidCredits').doc(userId).set({
      ...userDoc,
      balance: newBalance,
      totalEarned: newEarned,
      lastUpdated: new Date()
    }, { merge: true });

    // Log transaction
    await db.collection('creditTransactions').add({
      userId,
      amount,
      type: 'earn',
      reason,
      timestamp: new Date(),
      balanceAfter: newBalance
    });

    return newBalance;
  } catch (error) {
    console.error('Error adding credits:', error);
    return null;
  }
}

async function subtractCredits(userId, amount, reason = 'unknown') {
  try {
    const userDoc = await getCredits(userId);
    const currentBalance = userDoc?.balance || 0;

    if (currentBalance < amount) {
      return { success: false, message: 'Insufficient credits' };
    }

    const newBalance = currentBalance - amount;
    const newSpent = (userDoc?.totalSpent || 0) + amount;

    await db.collection('voidCredits').doc(userId).set({
      ...userDoc,
      balance: newBalance,
      totalSpent: newSpent,
      lastUpdated: new Date()
    }, { merge: true });

    // Log transaction
    await db.collection('creditTransactions').add({
      userId,
      amount,
      type: 'spend',
      reason,
      timestamp: new Date(),
      balanceAfter: newBalance
    });

    return { success: true, newBalance };
  } catch (error) {
    console.error('Error subtracting credits:', error);
    return { success: false, message: 'Error processing transaction' };
  }
}

// ==================== DAILY CHECK-IN ====================

async function claimDailyReward(userId) {
  try {
    const userDoc = await getCredits(userId);
    const today = new Date().toDateString();
    const lastClaimDate = userDoc?.lastDailyClaimDate?.toDate?.()?.toDateString?.();

    if (lastClaimDate === today) {
      return { success: false, message: 'You already claimed your daily reward today!' };
    }

    let newStreak = 0;
    if (lastClaimDate) {
      const lastDate = new Date(lastClaimDate);
      const currentDate = new Date(today);
      const diffTime = currentDate - lastDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Streak continues if claimed within 1 day
      if (diffDays === 1) {
        newStreak = Math.min((userDoc?.dailyStreak || 0) + 1, 6);
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const rewardAmount = 10 * newStreak; // 10 base × streak multiplier

    await db.collection('voidCredits').doc(userId).set({
      ...userDoc,
      dailyStreak: newStreak,
      lastDailyClaimDate: new Date(),
      balance: (userDoc?.balance || 0) + rewardAmount,
      totalEarned: (userDoc?.totalEarned || 0) + rewardAmount,
      lastUpdated: new Date()
    }, { merge: true });

    return {
      success: true,
      amount: rewardAmount,
      streak: newStreak,
      message: `Claimed ${rewardAmount} <:zyn_pouch:1234567890> (Streak: ${newStreak}/6)`
    };
  } catch (error) {
    console.error('Error claiming daily reward:', error);
    return { success: false, message: 'Error claiming reward' };
  }
}

// ==================== MESSAGE REWARDS ====================

async function recordMessage(userId) {
  try {
    const userDoc = await getCredits(userId);
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    let messageCount = userDoc?.messageCountThisWeek || 0;
    messageCount++;

    await db.collection('voidCredits').doc(userId).set({
      ...userDoc,
      messageCountThisWeek: messageCount,
      lastUpdated: new Date()
    }, { merge: true });

    return messageCount;
  } catch (error) {
    console.error('Error recording message:', error);
    return null;
  }
}

async function claimMessageReward(userId, messageCount, rewardAmount) {
  try {
    const userDoc = await getCredits(userId);

    // Check if already claimed this tier
    const claimedKey = `messageClaimed_${new Date().getFullYear()}_${new Date().getWeek()}`;
    if (userDoc?.messageRewardsClaimed?.[claimedKey]?.includes(messageCount)) {
      return { success: false, message: 'You already claimed this reward tier!' };
    }

    await addCredits(userId, rewardAmount, `message_reward_${messageCount}`);

    const claimed = userDoc?.messageRewardsClaimed || {};
    claimed[claimedKey] = [...(claimed[claimedKey] || []), messageCount];

    await db.collection('voidCredits').doc(userId).set({
      messageRewardsClaimed: claimed
    }, { merge: true });

    return { success: true, amount: rewardAmount };
  } catch (error) {
    console.error('Error claiming message reward:', error);
    return { success: false, message: 'Error claiming reward' };
  }
}

// ==================== INVITE TRACKING ====================

async function recordInvite(userId) {
  try {
    const userDoc = await getCredits(userId);
    const inviteCount = (userDoc?.inviteCount || 0) + 1;
    const rewardAmount = 15; // 15 credits per invite

    await db.collection('voidCredits').doc(userId).set({
      ...userDoc,
      inviteCount: inviteCount,
      balance: (userDoc?.balance || 0) + rewardAmount,
      totalEarned: (userDoc?.totalEarned || 0) + rewardAmount,
      lastUpdated: new Date()
    }, { merge: true });

    return { success: true, amount: rewardAmount, totalInvites: inviteCount };
  } catch (error) {
    console.error('Error recording invite:', error);
    return { success: false };
  }
}

// ==================== BOOST TRACKING ====================

async function recordBoost(userId) {
  try {
    const userDoc = await getCredits(userId);
    const boostCount = (userDoc?.boostCount || 0) + 1;
    const rewardAmount = 15; // 15 credits per boost

    await db.collection('voidCredits').doc(userId).set({
      ...userDoc,
      boostCount: boostCount,
      balance: (userDoc?.balance || 0) + rewardAmount,
      totalEarned: (userDoc?.totalEarned || 0) + rewardAmount,
      lastUpdated: new Date()
    }, { merge: true });

    return { success: true, amount: rewardAmount, totalBoosts: boostCount };
  } catch (error) {
    console.error('Error recording boost:', error);
    return { success: false };
  }
}

// ==================== ROLE REWARDS ====================

async function claimRoleReward(userId, roleId) {
  try {
    const config = await getTasksConfig();
    const roleReward = config?.roleRewards?.find(r => r.roleId === roleId);

    if (!roleReward) {
      return { success: false, message: 'Invalid role reward' };
    }

    // Check if already claimed today
    const today = new Date().toDateString();
    const userDoc = await getCredits(userId);
    const lastRoleClaim = userDoc?.lastRoleClaims?.[roleId]?.toDate?.()?.toDateString?.();

    if (lastRoleClaim === today) {
      return { success: false, message: 'You already claimed this role reward today!' };
    }

    await addCredits(userId, roleReward.amount, `role_reward_${roleId}`);

    const lastClaims = userDoc?.lastRoleClaims || {};
    lastClaims[roleId] = new Date();

    await db.collection('voidCredits').doc(userId).set({
      lastRoleClaims: lastClaims
    }, { merge: true });

    return { success: true, amount: roleReward.amount };
  } catch (error) {
    console.error('Error claiming role reward:', error);
    return { success: false, message: 'Error claiming reward' };
  }
}

// ==================== TASK CONFIGURATION ====================

async function getTasksConfig() {
  try {
    const doc = await db.collection('guildConfig').doc('tasks').get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting tasks config:', error);
    return null;
  }
}

async function setTasksConfig(config) {
  try {
    await db.collection('guildConfig').doc('tasks').set(config, { merge: true });
    return true;
  } catch (error) {
    console.error('Error setting tasks config:', error);
    return false;
  }
}

// ==================== SHOP OPERATIONS ====================

async function getShopConfig() {
  try {
    const doc = await db.collection('guildConfig').doc('shop').get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.error('Error getting shop config:', error);
    return null;
  }
}

async function setShopConfig(config) {
  try {
    await db.collection('guildConfig').doc('shop').set(config, { merge: true });
    return true;
  } catch (error) {
    console.error('Error setting shop config:', error);
    return false;
  }
}

async function purchaseItem(userId, itemId) {
  try {
    const shopConfig = await getShopConfig();
    const item = shopConfig?.items?.find(i => i.id === itemId);

    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    const userDoc = await getCredits(userId);
    const userBalance = userDoc?.balance || 0;

    if (userBalance < item.price) {
      return { success: false, message: `Insufficient credits. Need ${item.price}, have ${userBalance}` };
    }

    const result = await subtractCredits(userId, item.price, `purchase_${itemId}`);

    if (!result.success) {
      return result;
    }

    // Log purchase
    await db.collection('purchases').add({
      userId,
      itemId,
      itemName: item.name,
      price: item.price,
      timestamp: new Date()
    });

    return { success: true, item, newBalance: result.newBalance };
  } catch (error) {
    console.error('Error purchasing item:', error);
    return { success: false, message: 'Error processing purchase' };
  }
}

// ==================== LEADERBOARD ====================

async function getLeaderboard(limit = 10) {
  try {
    const snapshot = await db.collection('voidCredits')
      .orderBy('balance', 'desc')
      .limit(limit)
      .get();

    const leaderboard = [];
    snapshot.forEach(doc => {
      leaderboard.push({
        userId: doc.id,
        ...doc.data()
      });
    });

    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

// Helper function for week number
Date.prototype.getWeek = function() {
  const target = new Date(this.valueOf());
  const dayNr = (this.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
};

module.exports = {
  getCredits,
  addCredits,
  subtractCredits,
  claimDailyReward,
  recordMessage,
  claimMessageReward,
  recordInvite,
  recordBoost,
  claimRoleReward,
  getTasksConfig,
  setTasksConfig,
  getShopConfig,
  setShopConfig,
  purchaseItem,
  getLeaderboard
};
