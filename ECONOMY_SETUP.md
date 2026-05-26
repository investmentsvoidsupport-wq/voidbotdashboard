# Void Credits Economy System

## Overview
The economy system adds a comprehensive rewards and shop system to your Discord bot with:
- **Daily Check-in Rewards** (streak-based)
- **Role-based Rewards** (automatic periodic rewards)
- **Message Rewards** (weekly message count milestones)
- **Invite Rewards** (automatic tracking)
- **Boost Rewards** (server boost tracking)
- **Shop System** (buy items with credits)

## Setup Instructions

### 1. Create Discord Channels
You need two dedicated channels for the economy system:

1. **Void Tasks Channel** (for tasks/rewards panel)
   - Create a channel named `void-tasks` or similar
   - Make it read-only for regular members
   - Copy the Channel ID

2. **Shop Channel** (for shop panel)
   - Create a channel named `void-shop` or similar
   - Make it read-only for regular members
   - Copy the Channel ID

### 2. Update .env File
Add the channel IDs to your `.env` file:
```
# Economy System
TASKS_CHANNEL_ID=YOUR_TASKS_CHANNEL_ID_HERE
SHOP_CHANNEL_ID=YOUR_SHOP_CHANNEL_ID_HERE
```

### 3. Create Initial Shop Items
Use the shop command to add items:

```
/shop additem name:"Cool Role" price:500 description:"Get a cool color role!" emoji:"🌈"
/shop additem name:"Profile Badge" price:250 description:"Display a special badge!" emoji:"🏆"
/shop additem name:"Shoutout" price:750 description:"Get featured in server!" emoji:"📢"
```

### 4. Set Up Task Rewards
Configure the rewards system:

```
/tasks setup
```

This creates the tasks panel with all reward categories.

### 5. Post Shop Panel
After adding items, post the shop panel:

```
/shop setup
```

## Commands Reference

### Tasks Commands
- `/tasks setup` - Post the tasks/rewards panel
- `/tasks edit` - Edit reward configuration (JSON)
- `/tasks daily` - Claim daily reward
- `/tasks balance` - Check your credit balance

### Shop Commands
- `/shop setup` - Post the shop panel
- `/shop additem` - Add an item to the shop
- `/shop removeitem` - Remove an item from shop
- `/shop config` - Configure shop name, description, logo, thumbnail
- `/shop list` - List all shop items

## Reward System Details

### Daily Check-in
- **Base Reward:** 10 credits
- **Multiplier:** 1 credit per day (streak bonus)
- **Max Streak:** 6 days
- **Resets:** Streak resets if not claimed daily

Example:
- Day 1: 10 credits (1x streak)
- Day 2: 20 credits (2x streak)
- Day 3: 30 credits (3x streak)
- ...
- Day 6: 60 credits (6x streak) - MAX

### Message Rewards
Automatic rewards based on message count milestones (weekly):
- 1,000 messages → 400 credits
- 2,000 messages → 500 credits
- 3,000 messages → 600 credits
- 4,000 messages → 700 credits

Users are automatically notified when they hit a milestone.

### Role Rewards
Assign rewards to roles. Members with those roles can claim periodic rewards:

Configuration example (JSON):
```json
[
  {
    "roleId": "YOUR_ROLE_ID_1",
    "amount": 100
  },
  {
    "roleId": "YOUR_ROLE_ID_2",
    "amount": 500
  }
]
```

Default setup includes:
- `@Void Community` → 100 credits/day
- `@Staff Team` → 500 credits/day

### Invite Rewards
- **Reward per Invite:** 15 credits
- **Requirement:** Invited account must be 1+ day old
- **Tracking:** Automatic

### Boost Rewards
- **Reward per Boost:** 15 credits
- **Unlimited:** Members can stack multiple boosts
- **Automatic:** Rewards given automatically on boost

## Shop Configuration

### Add Shop Metadata
Configure the shop appearance:

```
/shop config
```

You can set:
- **Store Name** - Display name (default: "Void Shop")
- **Store Description** - Tagline/description
- **Logo URL** - Thumbnail image (PNG/JPG)
- **Thumbnail URL** - Large banner image (PNG/JPG)

## User Interface

### Tasks Panel (Claims)
Three main buttons:
1. **🔆 Claim Daily** - Claim daily streak reward
2. **🙋 Claim Role Reward** - Claim role-based rewards
3. **💰 View Credits** - Check balance and stats

### Shop Panel
- Select menu to browse and purchase items
- Shows item emoji, name, price, and description
- Instant transaction confirmation
- Balance updated automatically

## Data Structure (Firebase)

### Collections Created

#### `voidCredits` (User Data)
```json
{
  "userId": "123456789",
  "balance": 1500,
  "totalEarned": 5000,
  "totalSpent": 3500,
  "dailyStreak": 3,
  "lastDailyClaimDate": Timestamp,
  "messageCountThisWeek": 2500,
  "inviteCount": 5,
  "boostCount": 2,
  "lastRoleClaims": {
    "roleId": Timestamp
  },
  "messageRewardsClaimed": {
    "2024_20": [1000, 2000]
  }
}
```

#### `creditTransactions` (Transaction Log)
```json
{
  "userId": "123456789",
  "amount": 100,
  "type": "earn" | "spend",
  "reason": "daily_reward",
  "timestamp": Timestamp,
  "balanceAfter": 1500
}
```

#### `purchases` (Purchase History)
```json
{
  "userId": "123456789",
  "itemId": "item_123456",
  "itemName": "Cool Role",
  "price": 500,
  "timestamp": Timestamp
}
```

#### `guildConfig` Documents

**tasks** - Task rewards config
```json
{
  "roleRewards": [
    {
      "roleId": "123456",
      "roleName": "Void Community",
      "amount": 100
    }
  ],
  "messageRewards": [
    {
      "messageCount": 1000,
      "amount": 400
    }
  ]
}
```

**shop** - Shop config
```json
{
  "storeName": "Void Shop",
  "storeDescription": "Purchase exclusive items!",
  "logo": "https://...",
  "thumbnail": "https://...",
  "items": [
    {
      "id": "item_123",
      "name": "Cool Role",
      "price": 500,
      "description": "Get a cool color role!",
      "emoji": "🌈",
      "createdAt": Timestamp
    }
  ]
}
```

## Advanced: Custom Reward Configuration

### Edit Rewards via JSON
```
/tasks edit
```

Then enter JSON in the modals:

**Role Rewards JSON:**
```json
[
  {"roleId": "1234567890", "amount": 250},
  {"roleId": "0987654321", "amount": 100}
]
```

**Message Rewards JSON:**
```json
[
  {"messageCount": 500, "amount": 200},
  {"messageCount": 1000, "amount": 400},
  {"messageCount": 2000, "amount": 600}
]
```

## Emoji Reference
Make sure your bot has access to the custom emoji:
- Void Pouch: `:zyn_pouch:` (ID: 1310283145325707264)

If using different emoji, update:
1. `creditSystem.js` - Emoji references in reward messages
2. `tasks.js` - Embed fields with emoji
3. `shop.js` - Item selection display

## Troubleshooting

### Channel not found error
- Make sure `TASKS_CHANNEL_ID` and `SHOP_CHANNEL_ID` are set correctly in `.env`
- Verify the bot has permission to view and post in these channels

### Emoji not displaying
- Ensure the bot is in a server where the custom emoji exists
- Or change to Unicode emojis (😀, 🏆, etc.)

### Users not earning credits
- Check if messages are being recorded (should log in console)
- Verify Firebase connection is working
- Ensure `GuildIntentBits.MessageContent` is enabled in bot.js

### Rewards not showing
- Confirm role IDs are correct (must be actual Discord role IDs)
- Check task configuration with `/tasks list` equivalent
- Verify users have the roles that grant rewards

## Future Enhancements

Planned additions:
- Leaderboard command
- Level/tier system based on credits
- Seasonal battle pass
- Betting/gambling features
- Member profiles with stats
- Reward redemption for real perks (nitro, game gifts, etc.)
- Admin dashboard for economy management
- Decay/inflation management

## Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all channel IDs are set in `.env`
3. Ensure Firebase is properly connected
4. Check that all required Discord intents are enabled
