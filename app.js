const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors')
const session = require('express-session');
const flash = require('connect-flash');

const router = require("./routes");
const passport = require("./config/passport")
const sanitizeAll = require("./middleware/sanitizeAll")

const app = express();

const allowedOrigins = [
    'http://localhost:4100',
    "https://zenspace-admin.onrender.com",
    'https://zenspace-frontend.onrender.com',
    'http://192.168.1.100:8888',
    'http://192.168.1.100:8889'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
    allowedHeaders: ['Content-Type', 'Authorization']
};


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET || '43645758690JGKJFHVBV657',
    resave: false,
    saveUninitialized: true
}));

// Initialize passport and its session
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


app.use(express.static(path.join(__dirname, 'public')));
app.use(cors(corsOptions));
app.use(sanitizeAll);

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.title = res.locals.title || 'Home';  // Default title
    next();
});


app.use('/', router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
