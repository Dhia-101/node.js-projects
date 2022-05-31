const discord = require('discord.js')
var _ = require('lodash');
var fetch = require('fetch');
var q = require('q');
const fs = require('fs');

const REFRESH_INTERVAL = 1000 * 60;
const SEEN_POSTS_SIZE = 1000;
const channelId = process.env.TN_REDDIT_REPORTER_CHANNEL_ID;

const Client = new discord.Client({
  intents: [ discord.Intents.FLAGS.GUILDS, discord.Intents.FLAGS.GUILD_MESSAGES ]
})

Client.once('ready', async () => {
  checkRedditForUpdates() 
  setInterval(() => checkRedditForUpdates(), REFRESH_INTERVAL);
})

Client.login(process.env.TN_REDDIT_REPORTER_TOKEN);

function checkRedditForUpdates() {
  fetch.fetchUrl("https://www.reddit.com/r/tunisia/new.json", (error, meta, body) => {
    try {
      processRedditJson(JSON.parse(body.toString()));
    } catch(e) {
      console.log('error fetching the url.' + e);
      return;
    }
  });
}

function write(array, path) {
  fs.writeFileSync(path, JSON.stringify(array));
}

function read(path) {
  const fileContent = fs.readFileSync(path);
  const array = JSON.parse(fileContent);
  return array;
}

function processRedditJson(json) {
  var newPostIds = [];
  var newPosts = {};
  var promises = []; 
  var seenPosts = read('./seen-posts-data');

  json.data.children.reverse().forEach((post) => {
    if (!seenPosts.includes(post.data.id)) {
      // Normalize data
      post.data.images = post.data.preview ? post.data.preview.images : [];

      newPostIds.push(post.data.id);
      newPosts[post.data.id] = post.data;

      post.data.images.forEach((image) => {
        promises.push(fetchImage(image.source.url));
      })
    }
  });

  q.all(promises).then((fetchedImages) => {
    var images = {};

    fetchedImages.forEach((fetchedImage) => {
      images[fetchedImage.url] = fetchedImage.data;
    });

    newPostIds.forEach((postId) => {
      var newImages = [];

      newPosts[postId].images.forEach((image) => {
        newImages.push({
          width: image.source.width,
          data: images[image.source.url]
        });
      });

      newPosts[postId].images = newImages;
      sendEmbed(newPosts[postId]);
    });

    newPostIds.length ;
    seenPosts = seenPosts.concat(newPostIds);

    // Prevent memory leak
    if (seenPosts.length > SEEN_POSTS_SIZE) {
      seenPosts = seenPosts.slice(seenPosts.length - SEEN_POSTS_SIZE);
    }

    write(seenPosts, './seen-posts-data');
  });


}

function fetchImage(url) {
  var deferred = q.defer();

  fetch.fetchUrl(url, (error, meta, body) => {
    deferred.resolve({
      url: url,
      data: body.toString('base64')
    });
  });

  return deferred.promise;
}

function truncateString(string, length) {
  if (string.length > length) {
    return string.slice(0, length) + "...";
  } else {
    return string;
  }
}

async function sendEmbed(post) {
  const embed = {
    color: 15158332,
    title: truncateString(post.title, 150),
    url: post.url,
    author: {
      name: 'r/Tunisia Reporter Bot',
      icon_url: 'https://b.thumbs.redditmedia.com/adZqNxmrnhxl8-T-49niCWQo2r7OFVSXEEfQk1SFzXY.png',
    },
    description: truncateString(post.selftext, 300),
    timestamp: post.created_utc,

    footer: {
      text: 'By: ' + post.author_fullname,
      
    },
    
  };
  await Client.channels.cache.get(channelId).send({ embeds: [embed] });
}
