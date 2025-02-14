
"use strict"

const fs = require('fs');
var NewsStory = require('./NewsStory');
const INVALID_KEY = 'InvalidKey';
const INVALID_ARGUMENT = 'PersistenceError - InvalidArgument';
const DATA_FILE_NAME = __dirname + '/persistencestore.json'

const LATEST_ID_KEY = 'LATEST_ID';
const NEWS_STORIES_KEY = "NEWS_STORIES";

const TITLE_KEY = "title";
const CONTENT_KEY = "content";
const AUTHOR_KEY = "author";
const DATE_KEY = "date";
const IS_PUBLIC_KEY = "isPublic";

const FILTER_TITLE = 'title';
const FILTER_AUTHOR = 'author';
const FILTER_DATE_RANGE = 'dateRange';
const FILTER_START_DATE = 'startDate';
const FILTER_END_DATE = 'endDate';
const FILTER_ID = 'id';

var persistenceStoreInstance;

var PersistenceStore = function () {

    checkAndCreatePersistenceFile();
    
    /**
     * Checks if the persistencestore.txt file is created, if not creates a file with empty structure.
     */
    function checkAndCreatePersistenceFile() { 
        try {
            if(!fs.existsSync(DATA_FILE_NAME)) {
                let data = {};
                data[NEWS_STORIES_KEY] = {};
                data[LATEST_ID_KEY] = 0;
                fs.writeFileSync(DATA_FILE_NAME, JSON.stringify(data, null, "\t"));
            }
          } catch(err) {
            console.error(err)
          }
    }

    /**
     * Below code reads the data from the file as a json object.
     */
    PersistenceStore.prototype.getDataFromFileAsObj = function () {
        let data = fs.readFileSync(DATA_FILE_NAME, 'utf8');
        return JSON.parse(data);
    }

    /**
     * Below code writes data to the persistencestore.txt
     */
    PersistenceStore.prototype.writeToDataFile = function (data) {
        fs.writeFileSync(DATA_FILE_NAME, JSON.stringify(data, null, "\t"));
    }

    /**
     * Below code adds a news story to the persistencestore and returns an id generated by the persistence store
     * to uniquely identify this story.
     * Unique id is generated by incrementing latest ID + 1, default latestID is 0
     */
    PersistenceStore.prototype.addStory = function(title, content, author, isPublic, date) {
        let data = this.getDataFromFileAsObj();
        let latestID = data[LATEST_ID_KEY] + 1;
        let storyObj = {}

        storyObj[TITLE_KEY] = title;
        storyObj[CONTENT_KEY] = content;
        storyObj[AUTHOR_KEY] = author;
        storyObj[DATE_KEY] = new Date(date).toUTCString();
        storyObj[IS_PUBLIC_KEY] = isPublic;

        data[NEWS_STORIES_KEY][latestID] = storyObj;
        data[LATEST_ID_KEY] = latestID;
        this.writeToDataFile(data);
        return latestID;
    }

    /**
     * Below code updates the title of the news story for the given id.
     */
    PersistenceStore.prototype.updateTitle = function (id, newTitle) {
        let data = this.getDataFromFileAsObj();
        if (id in data[NEWS_STORIES_KEY]) {
            data[NEWS_STORIES_KEY][id][TITLE_KEY] = newTitle;
        } else {
            throw new Error(INVALID_KEY);
        }
        this.writeToDataFile(data);
    }

    /**
     * Below code updates the content of the news story for the given id.
     */
    PersistenceStore.prototype.updateContent = function (id, newContent) {
        let data = this.getDataFromFileAsObj();
        if (id in data[NEWS_STORIES_KEY]) {
            data[NEWS_STORIES_KEY][id][CONTENT_KEY] = newContent;
        } else {
            throw new Error(INVALID_KEY);
        }
        this.writeToDataFile(data);
    }

    /**
     * Below code deletes the story for the given id.
     * If id does not exists nothing is done. 
     * @author: pkedilay, changed logic to throw 404 error as per discussion in exam 
     */
    PersistenceStore.prototype.deleteStory = function (id) {
        let data = this.getDataFromFileAsObj();
        if (id in data[NEWS_STORIES_KEY]) {
            delete data[NEWS_STORIES_KEY][id];
        } else {
            throw new Error(INVALID_KEY);
        }
        this.writeToDataFile(data);
    }


    /**
     * Below code returns the news stories which match the fiven filter object.
     * if filter object is empty all stories are returned.
     * filter can have arguments, title, author dateRange {'startDate', 'endDate'}, id based on which stories can be filtered.
     * 
     * title - substring match.
     * startDate and endDate is valid - result will have all stories with date >= startDate and <= endDate.
     * if startDate is not null but endDate is null - result will have all stories with date >= startDate.
     * if endDate is not null but startDate is null - result will have all stories with date <= endDate
     * author - full string match.
     * id - matches by news story id.
     * 
     * 
     * if result matches id, it is returned instantly without matching other filters
     *
     * result has to match all valid filters.
     * 
     * 
     */
    PersistenceStore.prototype.getAllStories = function() {
        let data = this.getDataFromFileAsObj();
        return data[NEWS_STORIES_KEY];
    }

    PersistenceStore.prototype.getStoriesForFilter = function(filter) {
        let title = '';
        let author = '';
        let startDate = 0;
        let endDate = 0;
        let id = '';

        let filtersApplied = 0;
        if(FILTER_TITLE in filter) {
            title = filter[FILTER_TITLE];
        }
        if(FILTER_AUTHOR in filter) {
            author = filter[FILTER_AUTHOR];
        }
        if(FILTER_DATE_RANGE in filter) {
            if(FILTER_START_DATE in filter[FILTER_DATE_RANGE]) {
                let startDateVal = filter[FILTER_DATE_RANGE][FILTER_START_DATE];
                if(startDateVal.length > 0) {
                    if(validateTimestamp(startDateVal)) {
                        startDate = new Date(startDateVal).getTime();
                    } else {
                        throw new Error(INVALID_ARGUMENT + ": start date " + startDateVal + " filter should be a valid timestamp");
                    }
                }
            }
            if(FILTER_END_DATE in filter[FILTER_DATE_RANGE]) {
                let endDateVal = filter[FILTER_DATE_RANGE][FILTER_END_DATE];
                if(endDateVal.length > 0 ) { 
                    if(validateTimestamp(endDateVal)) {
                        endDate = new Date(endDateVal).getTime();
                    } else {
                        throw new Error(INVALID_ARGUMENT + ": end date " + endDateVal + " filter should be a valid timestamp");
                    }
                }
            }
        }
        if(FILTER_ID in filter) {
            id = filter[FILTER_ID];
        }
        if(title.length > 0) {
            filtersApplied += 1;
        }
        if(author.length > 0) {
            filtersApplied += 1;
        }
        if(startDate > 0 || endDate > 0) {
            filtersApplied += 1;
        }

        let data = this.getDataFromFileAsObj();

        let allNewsStories = data[NEWS_STORIES_KEY]
        // if(filtersApplied == 0) {
            
        //     return allNewsStories;
        // }
        let filteredNewsStories = {}

        let keys = Object.keys(allNewsStories)

        for(let i in keys) {
            let key = keys[i];
            let value = allNewsStories[key];
            if (!isNaN(id) && id > 0 && id == key) {
                //filteredNewsStories[key] = value;
                var newsStory = new NewsStory(value.title, value.content, value.author, value.isPublic, value.date);
                filteredNewsStories[key] = newsStory;
                return filteredNewsStories;
            }
            let filtersSatisfied = 0;
            if(validateTimestamp(startDate) && validateTimestamp(endDate)) {
                if(new Date(value.date).getTime() >= startDate && new Date(value.date).getTime() <= endDate) {
                    filtersSatisfied += 1;
                }
            } else if(validateTimestamp(startDate)) {
                if(new Date(value.date).getTime() >= startDate) {
                    filtersSatisfied += 1;
                }
            } else if(validateTimestamp(endDate)) {
                if(new Date(value.date).getTime() <= endDate) {
                    filtersSatisfied += 1;
                }
            }
            if(author.length > 0 && value.author == author) {
                filtersSatisfied += 1;
            }
            if(title.length > 0 && value.title.includes(title)){
                filtersSatisfied += 1;
            }

            let newDate = new Date(parseInt(value.date, 10)).toString();
            if(filtersSatisfied == filtersApplied || filtersApplied == 0) {
                var newsStory = new NewsStory(value.title, value.content, value.author, value.isPublic, value.date);
                filteredNewsStories[key] = newsStory;
            }
        }
        return filteredNewsStories;
    } 
}

/** 
 *  checks if date is a valid timestamp
*/
function validateTimestamp(date) {
    if(date == 0) {
        return false;
    }
    const newTimestamp = new Date(date).getTime();
    return !isNaN(parseFloat(newTimestamp)) && isFinite(newTimestamp);
}

/**
 * Returns the instance of persistenceStore
 * persistenceStoreInstance is a singleton.
 */
function getPersistenceStoreInstance() {
    if (persistenceStoreInstance == undefined) {
        persistenceStoreInstance = new PersistenceStore();
    }
    return persistenceStoreInstance;
}


module.exports = {getPersistenceStoreInstance : getPersistenceStoreInstance};