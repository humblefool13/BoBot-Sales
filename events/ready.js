const config_records = require('../models/configurations');
const sub_records = require('../models/subscriptionRecords');
const fs = require("fs");
const { EmbedBuilder, ActivityType } = require("discord.js");
const { WebSocket } = require('ws');
const { OpenSeaStreamClient, EventType } = require('@opensea/stream-js');
const fetch = require("node-fetch");
const { RateLimiter } = require("limiter");
const PriceUrl = "https://api.coingecko.com/api/v3/simple/price?ids=solana%2Cethereum&vs_currencies=usd";
let solPrice = 0;
let ethPrice = 0;
const limiter_OS = new RateLimiter({
  tokensPerInterval: 4,
  interval: "second",
  fireImmediately: true
});
const limiter_ME = new RateLimiter({
  tokensPerInterval: 2,
  interval: "second",
  fireImmediately: true
});
const limiter_LR = new RateLimiter({
  tokensPerInterval: 2,
  interval: "second",
  fireImmediately: true
});
const limiter_XY = new RateLimiter({
  tokensPerInterval: 4,
  interval: "second",
  fireImmediately: true
});
async function updatePrice() {
  const req = await fetch(PriceUrl);
  const temp = await req.json().catch();
  solPrice = Number(temp.solana.usd);
  ethPrice = Number(temp.ethereum.usd);
};
/////////////////////////////////////////////
////////  GET MARKETPLACES ENDPOINTS ////////
async function getOS(url) {
  const remainingRequests = await limiter_OS.removeTokens(1);
  if (remainingRequests < 0) return;
  const result = await fetch(url);
  const response = await result.json().catch();
  return response;
};
async function getOSKey(url) {
  const remainingRequests = await limiter_OS.removeTokens(1);
  if (remainingRequests < 0) return;
  const options = { method: 'GET', headers: { Accept: 'application/json', 'X-API-KEY': process.env['os_key'] } };
  const result = await fetch(url, options);
  const response = await result.json().catch();
  return response;
};
async function getME(url) {
  const remainingRequests = await limiter_ME.removeTokens(1);
  if (remainingRequests < 0) return;
  const result = await fetch(url);
  const response = await result.json().catch();
  return response;
};
async function getLR(url) {
  const remainingRequests = await limiter_LR.removeTokens(1);
  if (remainingRequests < 0) return;
  const result = await fetch(url);
  const response = await result.json().catch();
  return response;
};
async function getXY(url) {
  const remainingRequests = await limiter_XY.removeTokens(1);
  if (remainingRequests < 0) return;
  const options = {
    headers: {
      accept: 'application/json',
      'X-API-Key': process.env["x2y2_key"],
    },
    method: "GET"
  };
  const result = await fetch(url, options);
  const response = await result.json().catch();
  return response;
};
/////////////////////////////////////////////
////////////  GET BUYER STATUS //////////////
async function getBuyerStatusOS(buyer, slug) {
  let found = false;
  const url = `https://api.opensea.io/api/v1/collections?asset_owner=${buyer.trim()}&offset=0&limit=300`;
  let collections;
  do {
    collections = await getOS(url);
  } while (!Array.isArray(collections));
  collections.forEach((collection) => {
    if (collection.slug !== slug) return;
    if (collection.owned_asset_count > 1) found = true;
  });
  const field = found ? `[${buyer.slice(0, 5)}](https://opensea.io/${buyer})` : `[${buyer.slice(0, 5)}](https://opensea.io/${buyer}) ( New Holder <a:tadada:990317457187172382> )`;
  return field;
};
async function getBuyerStatusME(buyer, slug) {
  let found = false;
  const url = `https://api.opensea.io/api/v1/collections?asset_owner=${buyer.trim()}&offset=0&limit=300`;
  let collections;
  do {
    collections = await getOS(url);
  } while (!Array.isArray(collections));
  collections.forEach((collection) => {
    if (collection.slug !== slug) return;
    if (collection.owned_asset_count > 1) found = true;
  });
  const field = found ? `[${buyer.slice(0, 5)}](https://magiceden.io/u/${buyer})` : `[${buyer.slice(0, 5)}](https://magiceden.io/u/${buyer}) ( New Holder <a:tadada:990317457187172382> )`;
  return field;
};
async function getBuyerStatusLR(buyer, slug) {
  let found = false;
  const url = `https://api.opensea.io/api/v1/collections?asset_owner=${buyer.trim()}&offset=0&limit=300`;
  let collections;
  do {
    collections = await getOS(url);
  } while (!Array.isArray(collections));
  collections.forEach((collection) => {
    if (collection.slug !== slug) return;
    if (collection.owned_asset_count > 1) found = true;
  });
  const field = found ? `[${buyer.slice(0, 5)}](https://looksrare.org/accounts/${buyer})` : `[${buyer.slice(0, 5)}](https://looksrare.org/accounts/${buyer}) ( New Holder <a:tadada:990317457187172382> )`;
  return field;
};
async function getBuyerStatusXY(buyer, slug) {
  let found = false;
  const url = `https://api.opensea.io/api/v1/collections?asset_owner=${buyer.trim()}&offset=0&limit=300`;
  let collections;
  do {
    collections = await getOS(url);
  } while (!Array.isArray(collections));
  collections.forEach((collection) => {
    if (collection.slug !== slug) return;
    if (collection.owned_asset_count > 1) found = true;
  });
  const field = found ? `[${buyer.slice(0, 5)}](https://x2y2.io/user/${buyer}/items)` : `[${buyer.slice(0, 5)}](https://x2y2.io/user/${buyer}/items) ( New Holder <a:tadada:990317457187172382> )`;
  return field;
};
/////////////////////////////////////////////
///////////////  GET EVENTS /////////////////
async function getMEactivities(url) {
  let activities;
  do {
    activities = await getME(url);
  } while (!Array.isArray(activities));
  return activities;
};
async function getLRevents(url) {
  let events;
  do {
    events = await getLR(url);
  } while (!events || !events?.success);
  return events;
};
async function getXYevents(url) {
  let events;
  do {
    events = await getXY(url);
  } while (!events || !events?.data);
  return events;
};
/////////////////////////////////////////////
//////////////  SALES EMBED /////////////////
async function embedSalesOS(event, big) {
  const permalink = event.payload.item.permalink;
  const name = event.payload.item.metadata.name;
  const image = event.payload.item.metadata.image_url;
  const color = "#35FF6E";
  const lister = event.payload.maker.address;
  const buyer = await getBuyerStatusOS(event.payload.taker.address, event.payload.collection.slug);
  const decimals = event.payload.payment_token.decimals;
  const symbol = event.payload.payment_token.symbol;
  const price = Number(event.payload.sale_price) / (Math.pow(10, decimals));
  const priceUSD = (price * Number(event.payload.payment_token.usd_price)).toFixed(2);
  let embed = new EmbedBuilder()
    .setTitle(name)
    .setURL(permalink)
    .setColor(color)
    .setDescription(`has just been **SOLD** for **${price} ${symbol}**\n( US$ ${priceUSD} ) on [Opensea](https://opensea.io 'click to open opensea') <:OpenSeaLogo:990321456263098398>!`)
    .addFields([
      { name: "Sold By", value: `[${lister.slice(0, 5)}](https://opensea.io/${lister})`, inline: true },
      { name: "Bought by", value: buyer, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(image);
  } else {
    embed.setThumbnail(image);
  };
  return embed;
};
async function embedSalesME(event, slug, big) {
  const buyer = event.buyer;
  const buyerString = await getBuyerStatusME(buyer, slug);
  const lister = event.seller;
  const price = event.price;
  const token = event.tokenMint;
  let nftMetadata;
  do {
    nftMetadata = await getME(`https://api-mainnet.magiceden.dev/v2/tokens/${token}`);
  } while (!nftMetadata || !nftMetadata?.image)
  const name = nftMetadata.name;
  const image = nftMetadata.image;
  let embed = new EmbedBuilder()
    .setTitle(name)
    .setURL(`https://magiceden.io/item-details/${token}`)
    .setColor("#35FF6E")
    .setDescription(`has just been **SOLD** for **${price} SOL**\n( US$ ${(price * solPrice).toFixed(2)} ) on [Magic Eden](https://magiceden.io 'click to open magic eden') <:magicEden:990321805665374278>!`)
    .addFields([
      { name: "Sold By", value: `[${lister.slice(0, 5)}](https://magiceden.io/u/${lister})`, inline: true },
      { name: "Bought by", value: buyerString, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(image);
  } else {
    embed.setThumbnail(image);
  };
  return embed;
};
async function embedSalesLR(event, slug, big) {
  const name = event.token.name;
  const image = event.token.imageURI;
  const url = `https://looksrare.org/collections/${event.token.collectionAddress}/${event.token.tokenId}`;
  const color = "#35FF6E";
  const lister = event.from;
  const buyer = await getBuyerStatusLR(event.to, slug);
  const price = Number(event.order.price) / Math.pow(10, 18);
  const priceUsd = (price * ethPrice).toFixed(2);
  let embed = new EmbedBuilder()
    .setTitle(name)
    .setURL(url)
    .setColor(color)
    .setDescription(`has just been **SOLD** for **${price} ETH**\n( US$ ${priceUsd} ) on [Looksrare](https://looksrare.org 'click to open looksrare') <:looksblack:990321530510643340>!`)
    .addFields([
      { name: "Sold By", value: `[${lister.slice(0, 5)}](https://looksrare.org/accounts/${lister})`, inline: true },
      { name: "Bought by", value: buyer, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(image);
  } else {
    embed.setThumbnail(image);
  };
  return embed;
};
async function embedSalesXY(event, slug, big) {
  if (event.order.currency !== '0x0000000000000000000000000000000000000000' && event.order.currency !== '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2') return;
  const lister = event.from_address;
  const buyer = await getBuyerStatusXY(event.to_address, slug);
  const price = Number(event.order.price) / Math.pow(10, 18);
  const priceUsd = (price * ethPrice).toFixed(2);
  let metadata;
  do {
    metadata = await getOSKey(`https://api.opensea.io/api/v1/asset/${event.token.contract}/${event.token.token_id}/`);
  } while (!metadata || !metadata?.name)
  const url = `https://x2y2.io/eth/${event.token.contract}/${event.token.token_id}`;
  let embed = new EmbedBuilder()
    .setTitle(metadata.name)
    .setURL(url)
    .setColor("#35FF6E")
    .setDescription(`has just been **SOLD** for **${price} ETH**\n( US$ ${priceUsd} ) on [X2Y2 Marketplace](https://x2y2.io 'click to open x2y2 marketplace') <:x2y2:992453235610755092>!`)
    .addFields([
      { name: "Sold By", value: `[${lister.slice(0, 5)}](https://x2y2.io/user/${lister}/items)`, inline: true },
      { name: "Bought by", value: buyer, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(metadata.image_url);
  } else {
    embed.setThumbnail(metadata.image_url);
  };
  return embed;
};
/////////////////////////////////////////////
//////////////  LISTS EMBED /////////////////
function embedListOS(event, big) {
  const permalink = event.payload.item.permalink;
  const name = event.payload.item.metadata.name;
  const image = event.payload.item.metadata.image_url;
  const color = "#8A45FF";
  const lister = event.payload.maker.address;
  const expire_timestamp = new Date(event.payload.expiration_date).getTime();
  const decimals = event.payload.payment_token.decimals;
  const symbol = event.payload.payment_token.symbol;
  const price = Number(event.payload.base_price) / (Math.pow(10, decimals));
  const priceUSD = (price * Number(event.payload.payment_token.usd_price)).toFixed(2);
  let embed = new EmbedBuilder()
    .setTitle(name)
    .setURL(permalink)
    .setColor(color)
    .setDescription(`has just been **LISTED** for **${price} ${symbol}**\n( US$ ${priceUSD} ) on [Opensea](https://opensea.io 'click to open opensea') <:OpenSeaLogo:990321456263098398>!`)
    .addFields([
      { name: "Listed By", value: `[${lister.slice(0, 5)}](https://opensea.io/${lister})`, inline: true },
      { name: "Expires on", value: `<t:${parseInt(expire_timestamp / 1000)}:F>`, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(image);
  } else {
    embed.setThumbnail(image);
  };
  return embed;
};
function embedListsLR(event, big) {
  const name = event.token.name;
  const image = event.token.imageURI;
  const url = `https://looksrare.org/collections/${event.token.collectionAddress}/${event.token.tokenId}`;
  const color = "#8A45FF";
  const lister = event.from;
  const expire_timestamp = event.order.endTime;
  const price = Number(event.order.price) / Math.pow(10, 18);
  const priceUsd = (price * ethPrice).toFixed(2);
  let embed = new EmbedBuilder()
    .setTitle(name)
    .setURL(url)
    .setColor(color)
    .setDescription(`has just been **LISTED** for **${price} ETH**\n( US$ ${priceUsd} ) on [Looksrare](https://looksrare.org 'click to open looksrare') <:looksblack:990321530510643340>!`)
    .addFields([
      { name: "Listed By", value: `[${lister.slice(0, 5)}](https://looksrare.org/accounts/${lister})`, inline: true },
      { name: "Expires on", value: `<t:${expire_timestamp}:F>`, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(image);
  } else {
    embed.setThumbnail(image);
  };
  return embed;
};
async function embedListsXY(event, big) {
  if (event.order.currency !== '0x0000000000000000000000000000000000000000' && event.order.currency !== '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2') return;
  const lister = event.from_address;
  const expires = event.order.end_at;
  const price = Number(event.order.price) / Math.pow(10, 18);
  const priceUsd = (price * ethPrice).toFixed(2);
  let metadata;
  do {
    metadata = await getOSKey(`https://api.opensea.io/api/v1/asset/${event.token.contract}/${event.token.token_id}/`);
  } while (!metadata || !metadata?.name)
  const url = `https://x2y2.io/eth/${event.token.contract}/${event.token.token_id}`;
  let embed = new EmbedBuilder()
    .setTitle(metadata.name)
    .setURL(url)
    .setColor("#8A45FF")
    .setDescription(`has just been **LISTED** for **${price} ETH**\n( US$ ${priceUsd} ) on [X2Y2 Marketplace](https://x2y2.io 'click to open x2y2 marketplace') <:x2y2:992453235610755092>!`)
    .addFields([
      { name: "Listed By", value: `[${lister.slice(0, 5)}](https://x2y2.io/user/${lister}/items)`, inline: true },
      { name: "Expires on", value: `<t:${expires}:F>`, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(metadata.image_url);
  } else {
    embed.setThumbnail(metadata.image_url);
  };
  return embed;
};
async function embedListsME(event, big) {
  const seller = event.seller;
  const token = event.tokenMint;
  const price = event.price;
  let nftMetadata;
  do {
    nftMetadata = await getME(`https://api-mainnet.magiceden.dev/v2/tokens/${token}`);
  } while (!nftMetadata || !nftMetadata?.image)
  const name = nftMetadata.name;
  const image = nftMetadata.image;
  let embed = new EmbedBuilder()
    .setTitle(name)
    .setURL(`https://magiceden.io/item-details/${token}`)
    .setColor("#8A45FF")
    .setDescription(`has just been **LISTED** for **${price} SOL**\n( US$ ${(price * solPrice).toFixed(2)} ) on [Magic Eden](https://magiceden.io 'click to open magic eden') <:magicEden:990321805665374278>!`)
    .addFields([
      { name: "Listed By", value: `[${seller.slice(0, 5)}](https://magiceden.io/u/${seller})`, inline: true },
    ])
    .setTimestamp()
    .setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" });
  if (big) {
    embed.setImage(image);
  } else {
    embed.setThumbnail(image);
  };
  return embed;
};
/////////////////////////////////////////////

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`!!!!! ${client.user.tag} IS ON !!!!!`);
    client.user.setActivity(`Market Movement!`, { type: ActivityType.Watching });

    //////////////////////////////////////////

    await updatePrice();
    setInterval(updatePrice, 60 * 1000);
    let configurations;
    let slugs;
    async function updateConfigs() {
      configurations = await config_records.find({
        expired: false,
      });
      slugs = configurations.map((el) => el.opensea_slug.trim());
    };
    await updateConfigs();
    setInterval(updateConfigs, 1 * 60 * 1000);

    //////////////// OS EVENTS ////////////////

    const clientOS = new OpenSeaStreamClient({
      token: process.env['os_key'],
      connectOptions: {
        transport: WebSocket
      }
    });
    clientOS.onEvents("*", [EventType.ITEM_SOLD, EventType.ITEM_LISTED], async (event) => {
      const slug = event.payload.collection.slug;
      if (!slugs.includes(slug)) return;
      if (new Date(event.payload.event_timestamp).valueOf() + 5 * 60 * 1000 < Date.now()) return console.log(event);
      configurations.forEach(async (config) => {
        if (config.opensea_slug.trim() !== slug) return;
        if (event.event_type === "item_sold") {
          const embed = await embedSalesOS(event, config.big);
          const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.sale_channel);
          const webhooks = await channel.fetchWebhooks();
          webhooks.each((webhook) => {
            if (webhook.id !== config.sales_webhook_id) return;
            webhook.send({
              username: config.collection_name,
              avatarURL: config.collection_pfp,
              embeds: [embed],
            }).catch((e) => { });
          });
        } else {
          const embed = embedListOS(event, config.big);
          const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.list_channel);
          const webhooks = await channel.fetchWebhooks();
          webhooks.each((webhook) => {
            if (webhook.id !== config.listings_webhook_id) return;
            webhook.send({
              username: config.collection_name,
              avatarURL: config.collection_pfp,
              embeds: [embed],
            }).catch((e) => { });
          });
        };
      });
    });

    /*
    const channelToPush = await client.guilds.cache.get("1008754687148830792").channels.fetch("1012141439846731777");
    const availableWebhooks = await channelToPush.fetchWebhooks();
    availableWebhooks.each((webhook)=>{
      if (webhook.id !== "1012141447530696865") return;
      webhook.send({
        username: "OnChain Buccaneers (OCB) | BoBot",
        avatarURL: "https://openseauserdata.com/files/b5a183f7a5c95d4ab088dfff1f5becfc.png",
        embeds: [new EmbedBuilder().setTitle("OCB #787").setDescription("has just been SOLD for 0.299 ETH\n( US$ 420.72 ) on [Opensea](https://opensea.io/) <:OpenSeaLogo:990321456263098398>!").addFields({ name: 'Sold By', value: '[0xeAa](https://opensea.io/0xeAad53DE8f59F896d1F1a4006Df59e16d8119755)', inline: true },{ name: 'Bought By', value: '[0xb1f](https://opensea.io/0xb1f3aF600E63Ba0CFddB4139aF42084977Bd4800)', inline: true }).setImage("https://i.seadn.io/gae/SFXFMGBgF50Jueix7BaJrFu1emZ9R-R-e6X_AE9XhlZkccH7vVVLSLTjnkNBsWpyKZckbrdXOGnCXMDsYi14G2Fjn7cN9fV5zlCf?auto=format&w=1000").setFooter({ text: "Powered by bobotlabs.xyz", iconURL: "https://cdn.discordapp.com/attachments/1003741555993100378/1003742971000266752/gif.gif" }).setColor("#35FF6E")],
      }).catch((e) => { });
    });
    */

    //////////////// MAGIC EDEN EVENTS ////////////////

    function getSolCollections(configurations) {
      let sol = [];
      configurations.forEach((config) => {
        if (config.chain !== "SOL") return;
        sol.push(config);
      });
      pollSolanaEvents(sol);
    };
    getSolCollections(configurations);
    setInterval(function () { getSolCollections(configurations); }, 60000);
    async function pollSolanaEvents(configs) {
      let done = 0;
      let str = "";
      configs.forEach(async (config) => {
        const symbol = config.magiceden_symbol.trim();
        const slug = config.opensea_slug.trim();
        const url = `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/activities?offset=0&limit=500`;
        const activities = await getMEactivities(url);
        const timestampLatest = activities.length ? activities[0].blockTime : parseInt(Date.now() / 1000);
        str = str + [symbol, timestampLatest, config.discord_id, config.number].join(",") + "\n";
        const times = fs.readFileSync("./marketplaces/magiceden.txt", { encoding: 'utf8', flag: 'r' });
        const collections = times.split("\n");
        let timeStampLastLine = collections.find((el) => el.includes(symbol) && el.includes(config.discord_id) && el.includes(config.number));
        if (!timeStampLastLine) timeStampLastLine = `a,${parseInt(Date.now() / 1000)},a,a`;
        let timestampLast = timeStampLastLine.split(",");
        timestampLast = Number(timestampLast[1]);
        ++done;
        activities.forEach(async (event) => {
          if (event.blockTime <= timestampLast) return;
          if (event.type === "buyNow") {
            const embed = await embedSalesME(event, slug, config.big);
            const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.sale_channel);
            const webhooks = await channel.fetchWebhooks();
            webhooks.each((webhook) => {
              if (webhook.id !== config.sales_webhook_id) return;
              webhook.send({
                username: config.collection_name,
                avatarURL: config.collection_pfp,
                embeds: [embed],
              }).catch((e) => { });
            });
          } else if (event.type === "list") {
            const embed = await embedListsME(event, config.big);
            const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.list_channel);
            const webhooks = await channel.fetchWebhooks();
            webhooks.each((webhook) => {
              if (webhook.id !== config.listings_webhook_id) return;
              webhook.send({
                username: config.collection_name,
                avatarURL: config.collection_pfp,
                embeds: [embed],
              }).catch((e) => { });
            });
          };
        });
        if (done === configs.length) fs.writeFileSync("./marketplaces/magiceden.txt", str);
      });
    };

    //////////////// ETHEREUM EVENTS ////////////////

    function getEthCollections(configurations) {
      let eth = [];
      configurations.forEach((config) => {
        if (config.chain !== "ETH") return;
        eth.push(config);
      });
      pollLREvents(eth);
      pollXYEvents(eth);
    };
    getEthCollections(configurations);
    setInterval(function () { getEthCollections(configurations); }, 60000);
    async function pollLREvents(configs) {
      let done = 0;
      let str = "";
      configs.forEach(async (config) => {
        const address = config.contract_address.trim();
        const slug = config.opensea_slug.trim();
        const url = `https://api.looksrare.org/api/v1/events?collection=${address}&pagination[first]=150`;
        const getevents = await getLRevents(url);
        const events = getevents.data;
        const timestampLatest = events.length ? new Date(events[0].createdAt).getTime() : new Date.now();
        str = str + [address, timestampLatest, config.discord_id, config.number].join(",") + "\n";
        const times = fs.readFileSync("./marketplaces/looksrare.txt", { encoding: 'utf8', flag: 'r' });
        const collections = times.split("\n");
        let timeStampLastLine = collections.find((el) => el.includes(address) && el.includes(config.discord_id) && el.includes(config.number));
        if (!timeStampLastLine) timeStampLastLine = `a,${Date.now()},a,a`;
        let timestampLast = timeStampLastLine.split(",");
        timestampLast = Number(timestampLast[1]);
        ++done;
        events.forEach(async (event) => {
          const eventTimestamp = new Date(event.createdAt).getTime()
          if (eventTimestamp <= timestampLast) return;
          if (event.type === "SALE") {
            const embed = await embedSalesLR(event, slug, config.big);
            const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.sale_channel);
            const webhooks = await channel.fetchWebhooks();
            webhooks.each((webhook) => {
              if (webhook.id !== config.sales_webhook_id) return;
              webhook.send({
                username: config.collection_name,
                avatarURL: config.collection_pfp,
                embeds: [embed],
              }).catch((e) => { });
            });
          } else if (event.type === "LIST") {
            const embed = embedListsLR(event, config.big);
            const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.list_channel);
            const webhooks = await channel.fetchWebhooks();
            webhooks.each((webhook) => {
              if (webhook.id !== config.listings_webhook_id) return;
              webhook.send({
                username: config.collection_name,
                avatarURL: config.collection_pfp,
                embeds: [embed],
              }).catch((e) => { });
            });
          };
        });
        if (done === configs.length) fs.writeFileSync("./marketplaces/looksrare.txt", str);
      });
    };
    async function pollXYEvents(configs) {
      let done = 0;
      let str = "";
      configs.forEach(async (config) => {
        const address = config.contract_address.trim();
        const slug = config.opensea_slug.trim();
        const urlList = `https://api.x2y2.org/v1/events?limit=200&type=list&contract=${address}`;
        const urlSale = `https://api.x2y2.org/v1/events?limit=200&type=sale&contract=${address}`;
        const geteventsLists = await getXYevents(urlList);
        const geteventsSales = await getXYevents(urlSale);
        let listings = geteventsLists.data;
        let sales = geteventsSales.data;
        listings.sort(function (a, b) {
          return b.order.created_at - a.order.created_at;
        });
        sales.sort(function (a, b) {
          return b.order.created_at - a.order.created_at;
        });
        const salesTimestamp = sales.length ? sales[0].order.created_at : parseInt(Date.now() / 1000);
        const listsTimestamp = listings.length ? listings[0].order.created_at : parseInt(Date.now() / 1000);
        str = str + [address, salesTimestamp, listsTimestamp, config.discord_id, config.number].join(",") + "\n";
        const times = fs.readFileSync("./marketplaces/x2y2.txt", { encoding: 'utf8', flag: 'r' });
        const collections = times.split("\n");
        let timeStampLastLine = collections.find((el) => el.includes(address) && el.includes(config.discord_id) && el.includes(config.number));
        if (!timeStampLastLine) timeStampLastLine = `a,${parseInt(Date.now() / 1000)},${parseInt(Date.now() / 1000)},a,a`;
        let timestampLast = timeStampLastLine.split(",");
        const timestampLastSales = Number(timestampLast[1]);
        const timestampLastLists = Number(timestampLast[2]);
        ++done;
        sales.forEach(async (sale) => {
          const eventTimestamp = Number(sale.order.created_at);
          if (eventTimestamp <= timestampLastSales) return;
          const embed = await embedSalesXY(sale, slug, config.big);
          if (!embed) return;
          const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.sale_channel);
          const webhooks = await channel.fetchWebhooks();
          webhooks.each((webhook) => {
            if (webhook.id !== config.sales_webhook_id) return;
            webhook.send({
              username: config.collection_name,
              avatarURL: config.collection_pfp,
              embeds: [embed],
            }).catch((e) => { });
          });
        });
        listings.forEach(async (list) => {
          const eventTimestamp = Number(list.order.created_at);
          if (eventTimestamp <= timestampLastLists) return;
          const embed = await embedListsXY(list, config.big);
          if (!embed) return;
          const channel = await client.guilds.cache.get(config.server_id).channels.fetch(config.list_channel);
          const webhooks = await channel.fetchWebhooks();
          webhooks.each((webhook) => {
            if (webhook.id !== config.listings_webhook_id) return;
            webhook.send({
              username: config.collection_name,
              avatarURL: config.collection_pfp,
              embeds: [embed],
            }).catch((e) => { });
          });
        });
        if (done === configs.length) fs.writeFileSync("./marketplaces/x2y2.txt", str);
      });
    };

    /////////////////// GENERAL //////////////////

    async function subFilter() {
      const subs = await sub_records.find();
      const subscribers = subs.map(e => e.discord_id);
      const members = await client.guilds.cache.get("969155191339384892").members.fetch();
      members.each((m) => {
        const id = m.id;
        if (m.roles.cache.has("991001363997659178") && !subscribers.includes(id)) return m.roles.remove("991001363997659178");
        if (!m.roles.cache.has("991001363997659178") && subscribers.includes(id)) return m.roles.add("991001363997659178");
      });
      subs.forEach(async (subscription) => {
        const end_timestamp = subscription.end_timestamp;
        const number = subscription.number;
        if (Date.now() < end_timestamp) return;
        await sub_records.deleteOne({
          discord_id: subscription.discord_id,
          number: number,
        }).catch((e) => {
          console.log(e);
        });
        const config = await config_records.findOne({
          discord_id: subscription.discord_id,
          number: number,
        });
        config.expired = true;
        config.expired_timestamp = Date.now();
        await config.save().catch((e) => { });
      });
      const configs = await config_records.find({
        expired: true,
      });
      configs.forEach(async (config) => {
        const timestamp = config.expired_timestamp;
        const diff = Date.now() - timestamp;
        if (diff < 1000 * 60 * 60 * 24 * 14) return;
        await config_records.deleteOne({
          discord_id: config.discord_id,
          number: config.number,
        }).catch((e) => {
          console.log(e);
        });
      });
    };
    subFilter();
    setInterval(subFilter, 10 * 60 * 1000);
  },
};
