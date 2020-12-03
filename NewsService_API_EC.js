const restify = require('restify'),
    fs = require('fs'),
    NewsService = require('./newsModel/NewsService'),
    { NotFoundError, BadRequestError } = require('restify-errors'),
    inspector = require('schema-inspector');;

const server = restify.createServer({
        key: fs.readFileSync('./ssl/privatekey.pem'),
        cert: fs.readFileSync('./ssl/certificate.pem')
    }),
    newsService = new NewsService();

const ROOT_ENDPOINT = '/',
    NEWS_ENDPOINT = '/stories',
    ID_PATH_PARAM = '/:id',
    ERROR404 = '404: Resource Not Found',
    NEWSSTORYNOTFOUND = 'NewsStoryNotFound',
    CONTENT_TYPE = 'Content-Type',
    JSON_TYPE = 'application/json';

// Restify middlewares 
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

// Endpoints
server.get(ROOT_ENDPOINT, (req, res, next) => {
    res.set(CONTENT_TYPE, 'text/html');
    res.write(`<h1>Welcome to News Service Open API.</h1>
    <p><a href='/stories'>Click here</a> to retrieve all stories.</p>`);
    res.end();
    return next();
});

server.get(NEWS_ENDPOINT, (req, res, next) => {
    try {
        var result = newsService.getStoriesForFilter(checkQueryParams(req.query));
        res.set(CONTENT_TYPE, JSON_TYPE);
        res.send(200, JSON.stringify(result));
        return next();
    } catch (err) {
        next(err);
    }
});

server.get(NEWS_ENDPOINT + ID_PATH_PARAM, idCheck, (req, res, next) => {
    try {
        var id = req.params.id;
        // The given API is returning all stories until :id value. So need to filter out only :id
        var result = newsService.getStoriesForFilter({ id })[id];
        res.set(CONTENT_TYPE, JSON_TYPE);
        // Thought of checking result.length and returning 404 if length is 0, but assignement document says return nothing!
        // if (Object.keys(result).length === 0) {
        //     next(new NotFoundError(ERROR404));
        // }
        res.send(200, JSON.stringify(result));
        return next();
    } catch (err) {
        next(err);
    }
});

server.post(NEWS_ENDPOINT, bodyCheck, (req, res, next) => {
    try {
        if (!sanitizePostData(req.body)) {
            throw new BadRequestError('Data Corrupt');
        }
        var { title, content, author, isPublic, date } = req.body;
        var storyId = newsService.addStory(title, content, author, isPublic, date);
        res.set(CONTENT_TYPE, JSON_TYPE);
        res.send(201, JSON.stringify({ storyId }));
        return next();
    } catch (err) {
        next(err);
    }
});

server.del(NEWS_ENDPOINT + ID_PATH_PARAM, idCheck, (req, res, next) => {
    try {
        newsService.deleteStory(req.params.id);
        res.send(204);
        return next();
    } catch (err) {
        next(err);
    }
});

server.put(NEWS_ENDPOINT + ID_PATH_PARAM, idCheck, bodyCheck, 
    (req, res, next) => {
        if (req.body.title) {
            try {
                if (!sanitizeUpdateTitle(req.body)) {
                    throw new BadRequestError('Data Corrupt');
                }
                newsService.updateTitle(req.params.id, req.body.title);
                res.send(204);
                return next(false);
            } catch (err) {
                if (err.message === NEWSSTORYNOTFOUND) {
                    return next(new NotFoundError(ERROR404));
                } else {
                    next(err);
                }
            }
        }
        return next();
    },
    (req, res, next) => {
        if (req.body.content) {
            try {
                if (!sanitizeUpdateContent(req.body)) {
                    throw new BadRequestError('Data Corrupt');
                }
                newsService.updateContent(req.params.id, req.body.content);
                res.send(204);
                return next(false);
            } catch (err) {
                if (err.message === NEWSSTORYNOTFOUND) {
                    return next(new NotFoundError(ERROR404));
                } else {
                    next(err);
                }
            }
        }
        return next();
    });

// Creating https server listening on port 3000
server.listen(3000, () => console.log(`Server Running @ https://localhost:3000/`));

/**
 * This function checks for query parameters in the request url and constructs filter according to API specification.
 * If either one of startDate or endDate is present the other value is taken by default to avoid failure.
 * This is not mentioned in the requirement, but I thought it is good to have, since this scenario is also valid.
 * 
 * @param {Request} req 
 */
function checkQueryParams(query) {
    var filter = query;
    if (query.startDate || query.endDate) {
        var { startDate, endDate } = query;
        if (!startDate) startDate = new Date(0);
        if (!endDate) endDate = new Date();
        filter['dateRange'] = { startDate, endDate };
    }
    return filter;
}

/**
 * Check if request has a body or not
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {any} next 
 */
function bodyCheck(req, res, next) {
    if (!req.body) {
        next(new BadRequestError('Body missing in the request'));
    } else {
        next();
    }
}

/**
 * Check if request has an id as path parameter
 * 
 * @param {Request} req
 * @param {Response} res 
 * @param {any} next 
 */
function idCheck(req, res, next) {
    if (!req.params.id) {
        next(new BadRequestError(`Unable to read story id`));
    } else {
        next();
    }
}

/**
 * Sanitization algorithm for Adding new story
 * 
 * @param {Object} data 
 */
function sanitizePostData(data) {
    var sanitizationCreate = {
        type: 'object',
        properties: {
            title: { type: 'string', rules: ['trim', 'title'] },
            content: { type: 'string', rules: ['trim', 'title'] },
            author: { type: 'string', rules: ['trim', 'title'] },
            isPublic: { type: 'boolean' },
            date: { type: 'date' }
        }
    };
    
    var validationCreate = {
        type: 'object',
        strict: true,
        properties: {
            title: { type: 'string', minLength: 1 },
            content: { type: 'string', minLength: 1 },
            author: { type: 'string', minLength: 1 },
            isPublic: { type: 'boolean' },
            date: { type: 'date' }
        }
    };

    inspector.sanitize(sanitizationCreate, data);
    var result = inspector.validate(validationCreate, data);
    console.log(`Sanitization result for sanitizePostData ${result.valid}`);
    if (!result.valid) {
        return false;
    }
    return true;
}

/**
 * Sanitization algorithm for updating title
 * 
 * @param {Object} data 
 */
function sanitizeUpdateTitle(data) {
    var sanitization = {
        type: 'object',
        properties: {
            title: { type: 'string', rules: ['trim', 'title'] }
        }
    };

    var validation = {
        type: 'object',
        strict: true,
        properties: {
            title: { type: 'string', minLength: 1 }
        }
    };

    inspector.sanitize(sanitization, data);
    var result = inspector.validate(validation, data);
    console.log(`Sanitization result for sanitizeUpdateTitle ${result.valid}`);
    if (!result.valid) {
        return false;
    }
    return true;
}

/**
 * Sanitization algorithm for updating content
 * 
 * @param {Object} data 
 */
function sanitizeUpdateContent(data) {
    var sanitization = {
        type: 'object',
        properties: {
            content: { type: 'string', rules: ['trim', 'title'] }
        }
    };

    var validation = {
        type: 'object',
        strict: true,
        properties: {
            content: { type: 'string', minLength: 1 }
        }
    };

    inspector.sanitize(sanitization, data);
    var result = inspector.validate(validation, data);
    console.log(`Sanitization result for sanitizeUpdateContent ${result.valid}`);
    if (!result.valid) {
        return false;
    }
    return true;
}