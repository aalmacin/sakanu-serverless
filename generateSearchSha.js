exports.generateSearchSha = ({term, domain, user = "global"}) => {
    const searchCombination = `${user.trim().toLowerCase()}-${term.trim().toLowerCase()}-${domain.trim().toLowerCase()}`;
    return require('crypto')
        .createHash('sha1').update(searchCombination)
        .digest('hex');
}