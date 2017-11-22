import * as mongoose from 'mongoose';
import * as Promise from 'bluebird';
import * as request from 'superagent';
import * as SteemConnect from 'sc2-sdk';
import * as steem from 'steem';
import Stats from './server/models/stats.model';
import Post from './server/models/post.model';
import config from './config/config';

import { createCommentPermlink } from './server/steemitHelpers';

(mongoose as any).Promise = Promise;
mongoose.connect(`${config.mongo.host}`);

const conn = mongoose.connection;
conn.once('open', function ()
{
  const paidRewardsDate = '1969-12-31T23:59:59';
  const botAccount = process.env.BOT;
  const refreshToken = process.env.REFRESH_TOKEN;
  const secret = process.env.CLIENT_SECRET;
  const forced = process.env.FORCED === 'true' || false;
  const now = new Date();
  const MAX_VOTE_EVER = 25;
  const MAX_USABLE_POOL = 10000;
  const DIFFICULTY_MULTIPLIER=1;


  const bots = [
    'animus',
    'appreciator',
    'arama',
    'ausbitbot',
    'bago',
    'bambam808',
    'banjo',
    'barrie',
    'bellyrub',
    'besttocome215',
    'bierkaart',
    'biskopakon',
    'blackwidow7',
    'blimbossem',
    'boomerang',
    'booster',
    'boostupvote',
    'bowlofbitcoin',
    'bp423',
    'brandybb',
    'brensker',
    'btcvenom',
    'buildawhale',
    'burdok213',
    'businessbot',
    'centerlink',
    'cleverbot',
    'cnbuddy',
    'counterbot',
    'crypto-hangouts',
    'cryptobooty',
    'cryptoholic',
    'cryptoowl',
    'cub1',
    'curationrus',
    'dahrma',
    'davidding',
    'decibel',
    'deutschbot',
    'dirty.hera',
    'discordia',
    'done',
    'drakkald',
    'drotto',
    'earthboundgiygas',
    'edrivegom',
    'emilhoch',
    'eoscrusher',
    'famunger',
    'feedyourminnows',
    'followforupvotes',
    'frontrunner',
    'fuzzyvest',
    'gamerpool',
    'gamerveda',
    'gaming-hangouts',
    'gindor',
    'givemedatsteem',
    'givemesteem1',
    'glitterbooster',
    'gonewhaling',
    'gotvotes',
    'gpgiveaways',
    'gsgaming',
    'guarddog',
    'heelpopulair',
    'helpfulcrypto',
    'idioticbot',
    'ikwindje',
    'ilvacca',
    'inchonbitcoin',
    'ipuffyou',
    'lovejuice',
    'mahabrahma',
    'make-a-whale',
    'makindatsteem',
    'maradaratar',
    'minnowbooster',
    'minnowhelper',
    'minnowpond',
    'minnowpondblue',
    'minnowpondred',
    'misterwister',
    'moonbot',
    'morwhale',
    'moses153',
    'moyeses',
    'msp-lovebot',
    'msp-shanehug',
    'muxxybot',
    'myday',
    'ninja-whale',
    'ninjawhale',
    'officialfuzzy',
    'perennial',
    'pimpoesala',
    'polsza',
    'portoriko',
    'prambarbara',
    'proctologic',
    'pumpingbitcoin',
    'pushup',
    'qurator',
    'qwasert',
    'raidrunner',
    'ramta',
    'randovote',
    'randowhale',
    'randowhale0',
    'randowhale1',
    'randowhaletrail',
    'randowhaling',
    'reblogger',
    'resteem.bot',
    'resteemable',
    'resteembot',
    'russiann',
    'scamnotifier',
    'scharmebran',
    'siliwilly',
    'sneaky-ninja',
    'sniffo35',
    'soonmusic',
    'spinbot',
    'stackin',
    'steemedia',
    'steemholder',
    'steemit-gamble',
    'steemit-hangouts',
    'steemitgottalent',
    'steemmaker',
    'steemmemes',
    'steemminers',
    'steemode',
    'steemprentice',
    'steemsquad',
    'steemthat',
    'steemvoter',
    'stephen.king989',
    'tabea',
    'tarmaland',
    'timbalabuch',
    'trail1',
    'trail2',
    'trail3',
    'trail4',
    'trail5',
    'trail6',
    'trail7',
    'viraltrend',
    'votey',
    'waardanook',
    'wahyurahadiann',
    'wannabeme',
    'weareone1',
    'whatamidoing',
    'whatupgg',
    'wildoekwind',
    'wiseguyhuh',
    'wistoepon',
    'zdashmash',
    'zdemonz',
    'zhusatriani'
  ];
  const query = {
    reviewed: true,
    author: { $ne: botAccount },
    'active_votes.voter': { $ne: botAccount },
    created: {
      $lte: new Date(now.getTime() - 6*60*60*1000).toISOString()
    },
    cashout_time: {
      $gt: paidRewardsDate,
    },
  };

  console.log("-----BOT-------", botAccount);
  console.log("-----TOKEN-------", refreshToken);
  console.log("-----SECRET-------", secret);


  const checkVotingPower = (callback) => {
    const limitPower = 10000;
    steem.api.getAccounts([botAccount], function(err, accounts) {
      if (!err) {
        const botStatus = accounts[0];

        const secondsago = (new Date().getTime() - new Date(botStatus.last_vote_time + "Z").getTime()) / 1000;
        const votingPower = botStatus.voting_power + (10000 * secondsago / 432000);

        if (votingPower < limitPower && !forced) {
          console.log("UPS I AM SO TIRED TODAY. VOTED TOO MUCH", votingPower);
          conn.close();
          process.exit(0);
          return;
        }

        callback(votingPower);
        return;
      }
      console.log("VOTING PW ERROR", err);
      conn.close();
      process.exit(0);
    });
  }


  const proceedVoting = (scoredPosts, categories_pool) => {
    console.log("SCORED POSTS", scoredPosts.length);
    scoredPosts.forEach((post, index) => {

      setTimeout(function(){
        const finalScore = post.finalScore;
        const category = post.category;
        const assignedWeight = (finalScore / categories_pool[category].total_vote_weight * 100) * categories_pool[category].assigned_pool / 100;
        const calculatedVote = Math.round(assignedWeight / categories_pool[category].assigned_pool * 100);
        const finalVote = calculatedVote >= categories_pool[category].max_vote ? categories_pool[category].max_vote : calculatedVote;


        const achievements = post.achievements;
        const jsonMetadata = { tags: ['utopian-io'], community: 'utopian', app: `utopian/1.0.0` };
        let commentBody = '';

        commentBody = `### Hey @${post.author} I am @${botAccount}. I have just upvoted you at ${finalVote}% Power!\n`;

        if (achievements.length > 0) {
          commentBody += '#### Achievements\n';
          achievements.forEach(achievement => commentBody += `- ${achievement}\n`);
        }

        if (finalVote <= 10) {
          commentBody += '#### Suggestions\n';
          commentBody += `- Work on your followers to increase the votes/rewards. My vote is on the human input. Good luck!\n`
          commentBody += `- Contribute more often to get higher and higher rewards. I want to see you often!\n`
          commentBody += `- Wondering why other contributions got more? I introduced a competition factor. My vote is based also on how competitive the category used is.\n`
        }

        commentBody += '#### Community-Driven Witness!\n';

        commentBody += `I am the first and only Steem Community-Driven Witness. <a href="https://discord.gg/2rSx9Eu">Participate on Discord</a>. Lets GROW TOGETHER!\n`
        commentBody += `- <a href="https://v2.steemconnect.com/sign/account-witness-vote?witness=utopian-io&approve=1">Vote for my Witness</a>\n`
        commentBody += `- <a href="https://v2.steemconnect.com/sign/account-witness-proxy?proxy=utopian-io&approve=1">Proxy to my Witness</a>\n`
        commentBody += `- Or vote/proxy on <a href="https://steemit.com/~witnesses">Steemit Witnesses</a>\n`
        commentBody += `\n[![mooncryption-utopian-witness-gif](https://steemitimages.com/DQmYPUuQRptAqNBCQRwQjKWAqWU3zJkL3RXVUtEKVury8up/mooncryption-s-utopian-io-witness-gif.gif)](https://steemit.com/~witnesses)\n`
        commentBody += '\n**Up-vote this comment to grow my power and help Open Source contributions like this one. Want to chat? Join me on Discord https://discord.gg/Pc8HG9x**';

        console.log('--------------------------------------\n');
        console.log('https://utopian.io/utopian-io/@'+post.author+'/'+post.permlink);
        console.log('VOTE:' + finalVote + '\n');
        console.log('CATEGORY', category);
        console.log(commentBody);
        console.log('--------------------------------------\n');

        let i = 0;
        const comment = () => {
          SteemConnect.comment(
            post.author,
            post.permlink,
            botAccount,
            createCommentPermlink(post.author, post.permlink),
            '',
            commentBody,
            jsonMetadata,
          ).then(() => {
            if (index + 1 === scoredPosts.length) {
              conn.close();
              process.exit(0);
            }
          }).catch(e => {
            if (e.error_description == undefined) {
              console.log("COMMENT SUBMITTED");
              if (index + 1 === scoredPosts.length) {
                conn.close();
                process.exit();
              }
            } else {
              console.log("COMMENT ERROR", e);
            }
          });
        };

        SteemConnect.vote(botAccount, post.author, post.permlink, finalVote * 100)
          .then(() => {
            comment();
          }).catch(e => {
          // I think there is a problem with sdk. Always gets in the catch
          if (e.error_description == undefined) {
            console.log("VOTED");
            comment();
          }
        });

      }, index * 30000);
    })
  };

  request
    .get(`https://v2.steemconnect.com/api/oauth2/token?refresh_token=${refreshToken}&client_secret=${secret}&scope=vote,comment,comment_delete,comment_options,custom_json,claim_reward_balance,offline`)
    .end((err, res) => {
      if (!res.body.access_token) {
        console.log("COULD NOT GET ACCESS TOKEN", res);
        conn.close();
        process.exit(0);
        return;
      }
      if (res.body.access_token) {
        SteemConnect.setAccessToken(res.body.access_token);
      }
      checkVotingPower(function(){
        Stats.get()
          .then(stats => {
            steem.api.getRewardFund('post', (err, rewardFund) => {
              const {categories} = stats;
              Post
                .countAll({query})
                .then(limit => {
                  Post
                    .list({skip: 0, limit: limit, query, sort: {net_votes: -1}})
                    .then(posts => {
                      const scoredPosts: any[] = [];

                      if (!posts.length) {
                        console.log("NO POSTS");
                        conn.close();
                        process.exit(0);
                        return;
                      }

                      console.log("FOUND POSTS TO VOTE: ", posts.length);


                      var categories_pool = {
                        "ideas": {
                          "difficulty" : 1*DIFFICULTY_MULTIPLIER,
                          "total_vote_weight": 0,
                          "max_vote": 10,

                        },
                        "sub-projects": {
                          "total_vote_weight": 0,
                          "max_vote": MAX_VOTE_EVER,
                          "difficulty" : 2*DIFFICULTY_MULTIPLIER
                        },
                        "development": {
                          "total_vote_weight": 0,
                          "max_vote": MAX_VOTE_EVER,
                          "difficulty" : 2*DIFFICULTY_MULTIPLIER
                        },
                        "bug-hunting": {
                          "total_vote_weight": 0,
                          "max_vote": 15,
                          "difficulty" : 1*DIFFICULTY_MULTIPLIER
                        },
                        "translations": {
                          "total_vote_weight": 0,
                          "max_vote": MAX_VOTE_EVER,
                          "difficulty" : 1.5*DIFFICULTY_MULTIPLIER
                        },
                        "graphics": {
                          "total_vote_weight": 0,
                          "max_vote": MAX_VOTE_EVER,
                          "difficulty" : 1.5*DIFFICULTY_MULTIPLIER

                        },
                        "analysis": {
                          "total_vote_weight": 0,
                          "max_vote": MAX_VOTE_EVER,
                          "difficulty" : 1.8*DIFFICULTY_MULTIPLIER
                        },
                        "social": {
                          "total_vote_weight": 0,
                          "max_vote": 25,
                          "difficulty" : 1.5*DIFFICULTY_MULTIPLIER
                        },
                        "documentation": {
                          "total_vote_weight": 0,
                          "max_vote": 20,
                          "difficulty" : 1.5*DIFFICULTY_MULTIPLIER
                        },
                        "tutorials": {
                          "total_vote_weight": 0,
                          "max_vote": 20,
                          "difficulty" : 1.55*DIFFICULTY_MULTIPLIER
                        },
                        "video-tutorials": {
                          "total_vote_weight": 0,
                          "max_vote": MAX_VOTE_EVER,
                          "difficulty" : 1.65*DIFFICULTY_MULTIPLIER
                        },
                        "copywriting": {
                          "total_vote_weight": 0,
                          "max_vote": 20,
                          "difficulty" : 1.55*DIFFICULTY_MULTIPLIER
                        },
                        "blog": {
                          "total_vote_weight": 0,
                          "max_vote": 10,
                          "difficulty" : 1*DIFFICULTY_MULTIPLIER
                        },
                        "tasks-requests": {
                          "total_vote_weight": 0,
                          "max_vote": 15,
                          "difficulty" : 1.1*DIFFICULTY_MULTIPLIER
                        },
                      };

                      var total_weighted_length=0;

                      for (var elt in categories_pool)
                      {
                        categories_pool[elt].weighted_length=posts.filter(post => post.json_metadata.type === elt).length*categories_pool[elt].difficulty;
                        total_weighted_length+=categories_pool[elt].weighted_length;
                      }

                      for (var elt in categories_pool)
                      {
                        if(elt!=='tasks-requests')
                          (categories_pool[elt] as any).assigned_pool =(posts.filter(post => post.json_metadata.type === elt).length / total_weighted_length * 100) *categories_pool[elt].difficulty* MAX_USABLE_POOL / 100;
                        else
                          (categories_pool[elt] as any).assigned_pool =(posts.filter(post => post.json_metadata.type.indexOf('task-') > -1).length / posts.length * 100) *categories_pool[elt].difficulty* MAX_USABLE_POOL / 100;
                      }

                      console.log(categories_pool);

                      posts.forEach((post, allPostsIndex) => {
                        steem.api.getAccounts([post.author], (err, accounts) => {
                          if (!err) {
                            if (accounts && accounts.length === 1) {
                              const account = accounts[0];

                              steem.api.getFollowCount(account.name, function (err, followers) {
                                const contributionsQuery = {
                                  reviewed: true,
                                  id: {$ne: post.id},
                                  author: post.author,
                                };

                                Post
                                  .countAll({query: contributionsQuery})
                                  .then(contributionsCount => {

                                    const achievements: string[] = [];
                                    const categoryStats = categories[post.json_metadata.type];
                                    const averageRewards = categoryStats.average_paid_authors + categoryStats.average_paid_curators;
                                    const reputation = steem.formatter.reputation(account.reputation);
                                    const votes = post.active_votes.filter(vote => bots.indexOf(vote.voter) <= 0);
                                    const getUpvotes = activeVotes => activeVotes.filter(vote => vote.percent > 0);
                                    const upVotes = getUpvotes(votes);
                                    let totalGenerated = 0;
                                    let totalWeightPercentage = 0;

                                    upVotes.forEach((upVote, upVoteIndex) => {
                                      const totalPayout = parseFloat(post.pending_payout_value)
                                        + parseFloat(post.total_payout_value)
                                        + parseFloat(post.curator_payout_value);

                                      const voteRshares = votes.reduce((a, b) => a + parseFloat(b.rshares), 0);
                                      const ratio = totalPayout / voteRshares;
                                      const voteValue = upVote.rshares * ratio;
                                      const upvotePercentageOnTotal = (voteValue / totalPayout) * 100;

                                      totalGenerated = totalGenerated + voteValue;
                                      // fallback mechanism for big accounts never voting at their 100%. Using instead the impact on their vote on the amount of rewards
                                      totalWeightPercentage = totalWeightPercentage + (upvotePercentageOnTotal > upVote.percent ? upvotePercentageOnTotal : upVote.percent);
                                    });

                                    const averageWeightPercentage = totalWeightPercentage / upVotes.length / 100;
                                    const rankConsensus = averageWeightPercentage * upVotes.length / 100;
                                    let finalScore = rankConsensus;

                                    if (finalScore > 50) {
                                      achievements.push('WOW WOW WOW People loved what you did here. GREAT JOB!');
                                    }

                                    // help the user grow the followers
                                    if(followers.follower_count < 500) {
                                      finalScore = finalScore + 10;
                                      achievements.push('You have less than 500 followers. Just gave you a gift to help you succeed!');
                                    }
                                    if(totalGenerated > averageRewards) {
                                      finalScore = finalScore + 10;
                                      achievements.push('You are generating more rewards than average for this category. Super!;)');
                                    }
                                    if (contributionsCount === 0) {
                                      // this is the first contribution of the user accepted in the Utopian feed
                                      // give the user a little gift
                                      finalScore = finalScore + 10;
                                      achievements.push('This is your first accepted contribution here in Utopian. Welcome!');
                                    }
                                    // number of contributions in total
                                    if (contributionsCount > 0) {
                                      finalScore = finalScore + 5;

                                      if (contributionsCount >= 15) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      if (contributionsCount >= 40) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      if (contributionsCount >= 60) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      if (contributionsCount >= 120) {
                                        // git for being productive
                                        finalScore = finalScore + 2.5;
                                      }
                                      achievements.push('Seems like you contribute quite often. AMAZING!');
                                    }

                                    if(reputation >= 25) finalScore = finalScore + 2.5;
                                    if(reputation >= 50) finalScore = finalScore + 2.5;
                                    if(reputation >= 65) finalScore = finalScore + 2.5;
                                    if(reputation >= 70) finalScore = finalScore + 2.5;

                                    post.finalScore = finalScore >= 100 ? 100 : Math.round(finalScore);
                                    post.achievements = achievements;
                                    post.category = post.json_metadata.type.indexOf('task-') > - 1 ? 'tasks-requests' : post.json_metadata.type;

                                    if (post.json_metadata.type.indexOf('task-') > - 1) {
                                      categories_pool['tasks-requests'].total_vote_weight = categories_pool['tasks-requests'].total_vote_weight + finalScore;
                                    }else{
                                      categories_pool[post.json_metadata.type].total_vote_weight = categories_pool[post.json_metadata.type].total_vote_weight + finalScore;
                                    }

                                    scoredPosts.push(post);

                                    if (allPostsIndex + 1 === posts.length) {
                                      proceedVoting(scoredPosts, categories_pool);
                                    }
                                  });
                              });
                            }
                          }
                        });
                      });
                    });
                });
            });
          });
      });
    });
});
