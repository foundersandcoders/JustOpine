var bcrypt = require("bcrypt");
var client = require("./db.js");

module.exports = {

    client: client,

    addPerson: function (userInfo, callback) {
        // if id exists, skip generateID
        if (userInfo.userID){
            this.encryptPassword(userInfo, userInfo.userID, callback);
        } else {
           this.generateID(userInfo, function (err, id) {
                if(err){
                    callback(err, null);
                } else {
                    this.encryptPassword(userInfo, id, callback);
                }
            }.bind(this));
        }
    },

    generateID: function (userInfo, callback) {
        var id = Math.floor(100000 + Math.random() * 900000);
        this.client.sismember("allUserIDs", id, function(err, data) {
            if (err){
                callback(err, null);
            } else if (data === 1) { // if duplicate IDs
                this.generateID(userInfo, callback);
            } else {
                callback(null, id);
            }
        }.bind(this));
    },

    encryptPassword: function (userInfo, id, callback) {
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(userInfo.password, salt, function(err, passHash) {
                this.store(userInfo, passHash, id, function(err, userInfo){
                    if (err) {
                        callback(err, null);
                    } else {
                        callback(null, userInfo);
                    }
                });
            }.bind(module.exports));
        });
    },

    store: function (userInfo, passHash, id, callback) {

        var finalID = (userInfo.isTeacher ? id : userInfo.teacherID + ":" + userInfo.className + ":" + id);
        userInfo.userID = finalID;
        userInfo.password = passHash;


        var loginInformation = JSON.stringify({"userID": finalID, "password": passHash});
        var key2;
        if(userInfo.className){
          key2 = userInfo.teacherID + ":" + userInfo.className + ":pupil";
        } else {
          key2 = "teacher";
        }
        client.sadd("allUserIDs", id, function(err, data) {
            if(err){
                callback("error in sadd: " + err, null);
            } else {
                client.hmset("login", userInfo.username, loginInformation, function(err, data) {
                    if(err){
                        callback("error in hset with login: " + err, null);
                    } else {
                        delete userInfo.password;
                        client.hmset(key2, finalID, JSON.stringify(userInfo), function(error, data) {
                            if(err){
                                callback("error in hset with key2: " + error, null);
                            } else {
                                callback(null, "UI" + JSON.stringify(userInfo));
                            }
                        });
                    }
                });
            }
        });
    },

    getPupils: function(teacherID, className, callback) {
        var pupilsArray = [];
        var hashKey = teacherID + ":" + className + ":" + "pupil";
        this.client.hgetall(hashKey, function(err, pupils) {
            for (var key in pupils) {
                pupilsArray.push(pupils[key]);
            }
            var alphabeticalBySurname = pupilsArray.map(function(pupilObj) {
                return JSON.parse(pupilObj);
            })
            .sort(function(a, b) {
  				if (a.surname < b.surname) {
                    return -1;
                } else if (a.surname > b.surname) {
                    return 1;
                } else {
                    return 0;
                }
  			});
            callback(null, alphabeticalBySurname);
        });
    },

    addClass: function(teacherID, className, callback) {
        var setKey = teacherID + ":" + "class";
        this.client.sadd(setKey, className, function(err, data) {
            if(err){
                callback(err, null);
            } else if (data === 0){
                callback(null, false);
            } else {
                callback(null, true);
            }
        }.bind(this));

    },

    getClasses: function(teacherID, callback) {
        var setKey = teacherID + ":" + "class";
        client.smembers(setKey, function(err, classes) {
            if (err){
                callback(err, null);
            } else if (!classes || classes.length === 0){
                callback(null, classes);
            } else {
                //TODO: bring back the sorting function
                callback(null, classes);
            }
        });
    },

    addAssignment: function (teacherID, newAssignmentInfo, callback){
        this.generateID(newAssignmentInfo, function (err, assignmentID){
            if(err){
                callback(err, null);
            } else {
                var hashKey = teacherID + ":" + newAssignmentInfo.class + ":assignment";
                newAssignmentInfo.assignmentID = assignmentID;
                newAssignmentInfo.timestamp = Date.now();
                client.hmset(hashKey, assignmentID, JSON.stringify(newAssignmentInfo), function(err, data) {
                    if(err){
                        callback(err, null);
                    } else if (data === 0){
                        callback(null, false);
                    } else {
                        callback(null, true);
                    }
                });

            }
        });
    },

    getAssignment: function(teacherID, className, assignmentID, callback) {
        var hashKey = teacherID + ":" + className + ":" + "assignment";
        this.client.hgetall(hashKey, function(err, allClassAssignments) {
            var parsedAssignment = JSON.parse(allClassAssignments[assignmentID]);
            callback(null, parsedAssignment);
        });
    },

    getAssignmentsForOneClass: function (teacherID, className, callback) {
        var hashKey = teacherID + ":" + className + ":assignment";
        var responseData = [];
        client.hgetall(hashKey, function(err, assignments) {
            if (err) {
                callback(err, null);
            }

            for (var assignmentID in assignments){
                var parsedData = JSON.parse(assignments[assignmentID]);
                responseData.push(parsedData);
            }
            callback(null, responseData);
        });
    },

    getAssignmentsForAllClasses: function (teacherID, callback) {
        this.getClasses(teacherID, function(err, classesArray) {
            if (err) {
                callback(err, null);
            } else if (!classesArray || classesArray.length === 0) {
                callback(null, classesArray);
            } else {
                var assignments = [];
                var counter = 0;
                classesArray.forEach(function(e) {
                    var hashKey = teacherID + ":" + e + ":" + "assignment";
                    return client.hgetall(hashKey, function(err, data) {
                        for (var assignmentID in data){
                            var parsedData = JSON.parse(data[assignmentID]);
                            assignments.push(parsedData);
                        }
                        if(++counter === classesArray.length) {
                            callback(null, assignments);
                        }
                    });
                });
            }
        });
    },

    addResponse: function (timestamp, className, assignmentID, response, userName, userID, teacherID, callback) {
        var responseID;
        var setKey;
        var hashKey;

        this.generateID(response, function (err, id) {
            if(err){
                callback(err, null);
            } else {
                responseID = id;
                setKey = teacherID + ":" + className + ":" + assignmentID + ":reply";
                hashKey = teacherID + ":" + className + ":" + assignmentID  + ":" + responseID;
                // CHECK IF USER HAS RESPONDED BEFORE
                client.zrange(setKey, 0, -1, function(err, previousResponses){
                    if(err){
                        callback(err, null);
                    } else {
                        client.zadd(setKey, Number(timestamp), hashKey, function(err, data) {
                            if(err){
                                callback(err, null);
                            } else {
                                for (var objKey in response) {
                                    client.hset(hashKey, objKey, response[objKey]);
                                }
                                client.hmset(hashKey, "key", hashKey, "time", timestamp, "teacher", teacherID, "name", userName, "userID", userID, function(err, data){
                                    callback(null, true);
                                });
                            }
                        });
                    }
                }.bind(module.exports));
            }
        });
    },
    responseAlreadyExists: function(previousResponses, userID, callback){
        var previousResponsesLength = previousResponses.length;
        if (previousResponsesLength === 0){
            return false;
        } else {
            return previousResponses.some(function(e){
                return client.hget(e, "userID", function(err, storedID){
                    return storedID === userID;
                });
            });
        }
    },

    getResponseKeys: function (className, assignmentID, teacherID, callback){
        var setKey = teacherID + ":" + className + ":" + assignmentID + ":reply";
        client.zrange(setKey, 0, -1, function(err, data) {
            if(err){
                callback(err, null);
            } else {
                callback(null, data);
            }
        });
    },

    getResponseInfo: function (responseKeys, callback) {
        var responseData = [];
        var counter = 0;
        responseKeys.forEach(function(responseKey) {
            return client.hgetall(responseKey, function(err, data) {
                responseData.push(data);
                if(++counter === responseKeys.length) {
                    callback(null, responseData);
                }
            });
        });
    },
    getTeachers: function(callback){
        client.hgetall("teacher", function(err, teachersObj){
            var teachers = [];
            var counter = 0;
            client.hgetall("teacher", function(err, teachersObj) {
                for(var key in teachersObj){
                    teachers.push({
                        firstname : JSON.parse(teachersObj[key]).firstname,
                        surname: JSON.parse(teachersObj[key]).surname,
                        username: JSON.parse(teachersObj[key]).username
                    });
                }
                callback(null, teachers);
            });
        });
    }
};
