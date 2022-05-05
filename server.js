const fs = require('fs');
const request = require('request');


/*
    Image bot

    If you already have a bearer token the edit the settings below, under # Settings, if you don't have
    a bearer token then go to https://github.com/dinomar/Mastodon-bot-setup and follow the instructions there.

    If you are using the 'settings.json' file you should change the post_delay, visibility and sensitive
    settings in the 'settings.json' file.


    instance - The url should be without the http:// or https:// prefix. For example, mastodon.social.

    post_delay - The default is 1 hour between posts. 3600000(1 hour) = 60 minutes * 60 seconds * 1000 miliseconds.
               - The first post is sent after the post delay has passed.

    visibility - public, unlisted, or private(followers only).

    sensitive - Mark status and attached media as sensitive. Default is false.
*/


// # Settings
var instance = "";
var bearer_token = "";
var post_delay = 3600000;
var visibility = "public"; 
var sensitive = false;


// # Program
Log("Starting propaganda bot...");

// Load settings
LoadSettings();

// Check settings valid
if (!instance || instance == "" || !bearer_token || bearer_token == "") {
    Log("You need to set 'instance' and 'bearer_token', or use the 'settings.json' file.");
    Log("Exiting program...");
    return;
}

// Main loop
setInterval(() => {
    var session = LoadSession();
    var images = fs.readdirSync(__dirname + session.current_folder);

    // Check folder empty
    if (images.length == 0) {
        var temp = session.current_folder;
        session.current_folder = session.empty_folder;
        session.empty_folder = temp;

        images = fs.readdirSync(__dirname + session.current_folder);
    }

    // Get random image
    var randomImage = images[Math.floor(Math.random() * images.length)];

    Log(`Uploading '${randomImage}'`);

    // Post image
    request.post({
        url: `https://${instance}/api/v1/media`,
        formData: { file: fs.createReadStream(__dirname + session.current_folder + randomImage) },
        auth: { "bearer": bearer_token }}, (error, response, body) => {

            if (error) {
                LogError("Failed to upload image. Error: " + error);
                return;
            } else if (response.statusCode !== 200) {
                LogError("Failed to upload image. Status code: " + response.statusCode);
                return;
            }
        
            var json = JSON.parse(body);

            request.post({
                url: `https://${instance}/api/v1/statuses`,
                formData: { "media_ids[]": [json.id], "visibility": visibility, "sensitive": sensitive.toString() },
                auth: { "bearer": bearer_token }}, (error, response, body) => {

                    if (error) {
                        LogError("Failed to upload image. Error: " + error);
                        return;
                    } else if (response.statusCode !== 200) {
                        LogError("Failed to upload image. Status code: " + response.statusCode);
                        return;
                    }

                    // Update stats
                    session.posts += 1;

                    Log(`Uploaded '${randomImage}'. Total posts made: [${session.posts}]`);

                    // Move image to empty folder
                    fs.renameSync(__dirname + session.current_folder + randomImage, __dirname + session.empty_folder + randomImage);

                    // Save session data
                    SaveSession(session);
            });
    });
}, post_delay);


// Functions
function Log(message) {
    console.log(`[${new Date().toLocaleString()}] ${message}`);
}

function LogError(message) {
    console.error(`[${new Date().toLocaleString()}] ${message}`);
}

function LoadSession() {
    if (fs.existsSync('session.json')) {
        var data = fs.readFileSync('session.json');
        return JSON.parse(data);

    }
    else {
        return { current_folder: "/images1/", empty_folder: "/images2/", posts: 0 };
    }
}

function SaveSession(session) {
    fs.writeFileSync('session.json', JSON.stringify(session, null, "\t"))
}

function LoadSettings() {
    if (fs.existsSync('settings.json')) {
        var data = fs.readFileSync('settings.json');
        var settings = JSON.parse(data);

        instance = settings.instance;
        bearer_token = settings.bearerToken;
        post_delay = settings.post_delay;
        visibility = settings.visibility;
        sensitive = settings.sensitive;
    }
}