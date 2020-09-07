require('dotenv').config();

main = async () => {
    const targetForums = process.env.DISCORD_TARGETFORUMS.split(',');
    const targetChannels = process.env.DISCORD_TARGETCHANNELS.split(',');

    const getTargetChannel = (forum) => {
        var idx = targetForums.indexOf(forum);
        if (idx > 0)
            return targetChannels[idx];
        else
            return null;
    }

    console.log(targetChannels);
    console.log(targetForums);
    console.log(getTargetChannel("For Sale - PC Related"));
};
main();
