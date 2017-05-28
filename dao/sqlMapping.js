module.exports = {
    rewardHunter: {
        findProducts: 'select id, name,cash, coin from product',
        findByUserName: 'select * from admin where name=?',
        findByOpenId: 'select * from player where openid=?',
        insertPlayer: 'insert player set ?',
        findGameLevel: 'select * from gameLevel',
        findGameLevelById: 'select coin from gameLevel where id = ?',
        insertPlayerTransactionFlow: 'insert playerTransactionflow set ?',
        findRewards: 'select * from reward limit ?,?',
        findMerchants: 'select * from merchant limit ?,?',
        insertMerchant: 'insert merchant set ?',
        updateMerchant: 'update merchant set ? where openid=?',
        findRewardById: 'select * from reward where id = ?',
        findPlayers: 'select * from player limit ?,?',
        insertPlatformTransactionFlow: 'insert platformTransactionflow set ?',
        findByUniqueCode: 'select * from merchant where uniqueCode + ?',
        updatePlayerCoin: 'update player set coinBalance = coinBalance - ?, availableCoin = availableCoin - ? where id = ?',
        findPlayer: 'select id, coinBalance, availableCoin, nickname, headimgurl from player where openid =?',
        findMerchantByOpenId: 'select * from merchant where openid=?',
        insertMerchantTransactionFlow: 'insert merchantTransactionflow set ?',
        findCommissions: 'select id, amount, createDate from merchantTransactionflow where type = 0 and merchantId=? order by createDate DESC',
        updateMerchantBalance: 'update merchant set withdrawAmount = withdrawAmount+?,balance=balance-? where openid=?'
    }
}
