# SER 421 Lab 6

## Pre-Requisites
node.js, npm installed on the computer.

## Setup
Open terminal in the project root folder and run the following commands

`npm install`

`npm start`


[In case something goes wrong with the above, run this command for testing without EC2]

`npm test`

## Instructions:
1. I have implemented HTTPS. Keys are provided in `/ssl` folder with the project. No special setup required to run.
2. I have implemented JSON sanitization using `schema-inspector` npm-package. So, the steps are
    * The data is initially sanitized by the library
    * The data is parsed through a JSON validation algorithm, which checks the structure of the data.
    * Any bad request found will throw HTTP 400 error.
3. The endpoint to access is `https://localhost:3000/stories`. This might throw a warning/error on the browser, since the ssl keys are self generated using `openssl` and not from a trusted source on the internet.
4. Postman:
    1. Open Postman and import NewsService_test.json given.
    2. Run the server (See previous section)
    3. Open Runner (Button next to Import)
    4. Select NewsService_test_L6 
    5. Click on 'Run NewsService_test_L6'
    6. There are 14 test cases (4 additional than asked), all should pass.
    7. Alternatively you can run each test case individually, but the sequence of test cases matters, such as create to run before all tests.


## REST API Specification
1. API supports create, delete, update, and read operations.

i. create => Adds story to the persistence store. While adding it generates a unique id for a news story. Returns id - int (to uniquely identify the news service in the persistence store)

    Endpoint: https://localhost:3000/stories

    Method: POST
    
    Params:
        title    - string
        content  - string
        author   - string
        isPublic - boolean
        date - Any valid Javascript Date object format:
            ISO Date	"2015-03-25" (The International Standard)
            Short Date	"03/25/2015"
            Long Date	"Mar 25 2015" or "25 Mar 2015"
    
    Request Example: 
        Content-Type: application/json
        body: {
            "title"    : "New Title",
            "author"   : "New Author",
            "content"  : "New Content",
            "date"     : "10/31/2020",
            "isPublic" : true
        }
    
    HTTP Responses: 
        201 - OK
        400 - Bad Request
        405 - Wrong method invoked
    
    Response Example:
        Response.status : 201
        Response.body   : { storyId : 20 }
    
ii. editTitle - Updates new Title for news story identified using id.
    
    Endpoint: https://localhost:3000/stories/20

    Method: PUT
    
    Params:
        id - int (News story's id, present as query path parameter)
        title - string

    Request Example:
        Content-Type: application/json
        body: {
            "title": "Update title"
        }

    HTTP Responses: 
        201 - OK
        400 - Bad Request
        404 - id not found
        405 - Wrong method invoked

    Response Example:
        Response.status : 204

iii. editContent - updates content for news story
    
    Endpoint: https://localhost:3000/stories/20

    Method: PUT
    
    Params:
        id - int (News story's id, present as query path parameter)
        content - string

    Request Example:
        Content-Type: application/json
        body: {
            "content": "Update content"
        }

    HTTP Responses: 
        201 - OK
        400 - Bad Request
        404 - id not found
        405 - Wrong method invoked

    Response Example:
        Response.status : 204

iv. delete - deletes news story identified using id

    Endpoint: https://localhost:3000/stories/20

    Method: DELETE
    
    Params:
        id - int (News story's id, present as query path parameter)

    HTTP Responses: 
        204 - OK
        400 - Bad Request
        404 - id not found
        405 - Wrong method invoked

    Response Example:
        Response.status : 204

  v. search - To filter news stories and get a Map {id: NewsStory{title, content, author, isPublic, date} }.
              Returns a map with all {news story id - NewsStory object}

    Endpoint: https://localhost:3000/stories/

    Optional Query Params: 
        ?title=Update title
        ?author=New Author
        ?startDate=10/30/2020&endDate=10/10/2021
        ?title=Update title&author=New Author
        ?title=Update title&startDate=10/30/2020&endDate=10/10/2021
        ?author=New Author&startDate=10/30/2020&endDate=10/10/2021
        ?title=Update title&author=New Author&startDate=10/30/2020&endDate=10/10/2021

    Method: GET
    
    Params:
        title : string,
        author : string,
        startDate: "valid javascript date obj format"
        endDate: "valid javascript date obj format"

    HTTP Responses: 
        200 - OK
        405 - Wrong method invoked
        500 - Internal Server Error with Error message

    Response Example:
        Response.status : 200
vi. search - To filter news stories by id. Returns a story with {news story id - NewsStory object}

    Endpoint: https://localhost:3000/stories/21

    Method: GET
    
    Params:
        id - int (News story's id, present as query path parameter)

    HTTP Responses: 
        200 - OK
        405 - Wrong method invoked
        500 - Internal Server Error with Error message

    Response Example:
        Response.status : 200
        405 - Wrong method invoked
        500 - Internal Server Error with Error message
        

2. persistencestore.json
All news stories are stored in persistencestore.json in json format.
