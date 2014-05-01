'use strict';

module.exports = {
    db: 'mongodb://localhost/mean-dev',
    photoDirectory: '/Users/Frank/Pictures/Picasa\ Exports/Fotobok2009',
    caching: true,
    resize:true,
    app: {
        name: 'Photoflow - DEV'
    },
    facebook: {
        clientID: 'APP_ID',
        clientSecret: 'APP_SECRET',
        callbackURL: 'http://localhost:3000/auth/facebook/callback'
    },
    twitter: {
        clientID: 'CONSUMER_KEY',
        clientSecret: 'CONSUMER_SECRET',
        callbackURL: 'http://localhost:3000/auth/twitter/callback'
    },
    github: {
        clientID: 'APP_ID',
        clientSecret: 'APP_SECRET',
        callbackURL: 'http://localhost:3000/auth/github/callback'
    },
    google: {
        clientID: '873238942193-6rjbrlboqp5u7u4i63d907uo4g7meppm.apps.googleusercontent.com',
        clientSecret: 'hkefe34yURRpJShSP_s_Ek5J',
        callbackURL: 'http://localhost:3000/auth/google/callback'
    },
    linkedin: {
        clientID: 'API_KEY',
        clientSecret: 'SECRET_KEY',
        callbackURL: 'http://localhost:3000/auth/linkedin/callback'
    }
};
