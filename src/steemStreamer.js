const steem = require('steem')
const pack = require('./pack_generator.js')
const start_block = 36683168

var streamer = {
    db: null,
    lirb: 0,
    start: function(db) {
        streamer.db = db

        setInterval(() => {
            steem.api.getDynamicGlobalProperties(function(err, props) {
                streamer.lirb = parseInt(props.last_irreversible_block_num);
                //console.log('LIRB: '+streamer.lirb)
            })
        }, 3000)

        steem.api.getDynamicGlobalProperties(function(err, props) {
            streamer.lirb = parseInt(props.last_irreversible_block_num);         
            streamer.db.collection('last_steem_block').findOne({}, function(err, block) {
                if (err) throw err;
                if (!block) {
                    block = {
                        height: start_block
                    }
                    streamer.db.collection('last_steem_block').insertOne(block)
                }
                //console.log(`Last loaded block was ${block.height}`);
                const nextBlockNum = block.height + 1
                streamer.handleBlock(nextBlockNum)
            })
        })
    },
    handleBlock: function(blockNum) {
        if (streamer.lirb >= blockNum) {
            steem.api.getBlock(blockNum, function(err, block) {
                if (err) {
                    console.error(`Request 'getBlock' failed at block num: ${blockNum}, retry`, err);
                    streamer.handleBlock(blockNum);
                    return
                }
                streamer.work(block, function() {
                    streamer.db.collection('last_steem_block').replaceOne({height: blockNum-1}, {$set: {
                        height: blockNum,
                        timestamp: block.timestamp
                    }}, function(err) {
                        if (err) {
                            console.error("Failed to set 'block_height' on MongoDB", err);
                            streamer.handleBlock(blockNum);
                            return
                        }
                        if (blockNum%100 == 0)
                            console.log(`New block height is ${blockNum} ${block.timestamp}`);
                        streamer.handleBlock(blockNum + 1)
                    })
                })
            })
        } else {
            setTimeout(function() {
                streamer.handleBlock(blockNum)
            }, 100)
        }
    },
    work: function(block, cb) {
        let txs = block.transactions
        for (let i = 0; i < txs.length; i++) {
            let tx = txs[i];
            for (let y = 0; y < tx.operations.length; y++) {
                let op = tx.operations[y];
                if (op[0] === 'comment'
                   // && op[1].to === 'drugwars'

                ) {
                    //console.log('Received '+op[1].amount+' from '+op[1].from+' '+op[1].memo)
                    random.seed(block, tx, function(seed) {
                        pack.forge(seed)
                    })
                    
                }
            }
        }
        cb()
    }
}

module.exports = streamer

