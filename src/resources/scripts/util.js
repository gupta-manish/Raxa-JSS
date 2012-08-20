/**
 * Copyright 2012, Raxa
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * This class provides util methods and constants that are shared by the core, apps and modules
 */
/* Phone Number Validation */
Ext.apply(Ext.form.VTypes, {
    phone: function (value, field) {
        return value.replace(/[ \-\(\)]/g, '').length == 10;
    },
    phoneText: 'Invalid, number must be 10 digits',
    phoneMask: /[ \d\-\(\)]/
});

if (localStorage.getItem("host") == null) {
    var HOST = 'http://test.raxa.org:8080/openmrs';
} else HOST = localStorage.getItem("host");
var username;
var password;
var timeoutLimit = 20000;
var hospitalName = 'JSS Hospital';
var resourceUuid = [
['concept', 'height', 'HEIGHT (CM)'],
['concept', 'weight', 'WEIGHT (KG)'],
['concept', 'bmi', 'BODY MASS INDEX'],
['concept', 'regfee', 'Registration Fee'],
['form', 'basic', 'Basic Form - This form contains only the common/core elements needed for most forms'],
['encountertype', 'reg', 'REGISTRATION - Registration encounter'],
['encountertype', 'screener', 'SCREENER - Screener encounter'],
['encountertype', 'out', 'OUTPATIENT - Outpatient encounter'],
['encountertype', 'prescription', 'PRESCRIPTION - Prescription encounter'],
['encountertype', 'prescriptionfill', 'PRESCRIPTIONFILL - Prescriptionfill encounter'],
['location', 'screener', 'Screener Registration Disk - registration desk in a screener module'],
['location', 'waiting', 'Waiting Patient: Screener - patients assigned to a doctor'],
['encountertype', 'pharmacy', 'PHARMACY - visit to pharmacy'],
['concept', 'referred', 'REFERRING PERSON'],
['concept', 'notes', 'CLINICIAN NOTES'],
['concept', 'complaint', 'CHIEF COMPLAINT']
];

// This is the name of the Patient Identifier Type that is being Auto-Generated by the IDGen Module.
// Put the Identifier Type Name in between the /.* and the .*/
var idPattern = /.*RaxaEMR Identification Number.*/;

//BMI WHO Constants
var WHO_BMI_VSUNDERWEIGHT = 15;
var WHO_BMI_SUNDERWEIGHT = 16;
var WHO_BMI_UNDERWEIGHT = 18.5;
var WHO_BMI_NORMAL = 25;
var WHO_BMI_OVERWEIGHT = 30;
var WHO_BMI_OBESE = 35;
var WHO_BMI_SOBESE = 40;

// BMI Custom Constants
var BMI_MAX = 60;
var BMI_HEIGHT_MAX = 300;
var BMI_HEIGHT_MIN = 0;
var BMI_WEIGHT_MAX = 800;
var BMI_WEIGHT_MIN = 0;

// Enum for Key Maps
var KEY = {
    ENTER: 13
};

// Enum for Registration Module Page Numbers
var REG_PAGES = {
    HOME: {
        value: 0,
        name: "home"
    },
    REG_1: {
        value: 1,
        name: "registrationpart1"
    },
    ILLNESS_DETAILS: {
        value: 2,
        name: "illnessdetails"
    },
    REG_CONFIRM: {
        value: 3,
        name: "registrationconfirm"
    },
    REG_BMI: {
        value: 4,
        name: "registrationbmi"
    },
    SEARCH_1: {
        value: 5,
        name: "searchpart1"
    },
    SEARCH_2: {
        value: 6,
        name: "searchpart2"
    },
    SEARCH_CONFIRM: {
        value: 7,
        name: "searchconfirm"
    }
};

var UITIME = 120000;
var diffinUTC_GMT = 5.5;
//number of hours for everything to be before now
//OpenMRS checks whether encounters are ahead of current time --
//if a system clock is ahead of OpenMRS clock, some things can't be posted
//therefore, we need to fudge our time a few mins behind
var TIME_BEFORE_NOW = .1;

// The Util class provids several methods that are shared by the core, apps and modules
var Util = {
	
    /**
     *Returns the value of time difference in UTC and GMT
     *@return diffinUTC_GMT
     */
    getUTCGMTdiff: function() {
        return diffinUTC_GMT;
    },
	
    /**
     *Returns the value of time for updating the patients waiting title and automatic refresh
     *@return UITIME 
     */
    getUiTime: function () {
        return UITIME;
    },

    /**
     *Returns the value of TimeoutLimit for login timeout 
     *@return timeoutLimit for timeout in login 
     */
    Datetime: function (d, hours) {
        if (typeof hours == 'undefined') {
            hours = 0;
        }
        //subtracting time in case our clock is ahead of OpenMRS clock
        hours = hours+TIME_BEFORE_NOW;
        var MS_PER_MINUTE = 60000;
        var k = new Date(d - (60 * hours) * MS_PER_MINUTE);

        function pad(n) {
            return n < 10 ? '0' + n : n
        }
        return k.getFullYear() + '-' + pad(k.getMonth() + 1) + '-' + pad(k.getDate()) + 'T' + pad(k.getHours()) + ':' + pad(k.getMinutes()) + ':' + pad(k.getSeconds()) + 'Z'
    },
    getTimeoutLimit: function () {
        return timeoutLimit;
    },

    getHospitalName: function () {
        return hospitalName;
    },

    /**
     * Returns all the headers required for Basic Authenticated REST calls
     * @return headers object that includes Authorization, Accept and Content-Type
     */
    getBasicAuthHeaders: function () {
        var headers = {
            "Authorization": localStorage.getItem("basicAuthHeader"),
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        return headers;
    },

    /**
     * Logout the current user. Ends the current session
     */
    logoutUser: function () {
        Ext.Ajax.request({
            url: HOST + '/ws/rest/v1/session',
            withCredentials: true,
            useDefaultXhrHeader: false,
            method: 'DELETE',
            success: function () {
            // do nothing
            }
        });
    },

    /**
     * Saves the Basic Authentication header to Localstorage
     * Verifies if username + password is valid on server and saves as Base4 encoded string of user:pass
     */
    saveBasicAuthHeader: function (username, password) {
        Util.logoutUser(); //Delete existing logged in sessions
        //Check login and save to localStorage if valid
        //We are using a synchronous XMLHttp Request instead of an Asynchronous AJAX request
        var xmlReq = new XMLHttpRequest();
        xmlReq.open("GET", HOST + '/ws/rest/v1/session', false);
        xmlReq.setRequestHeader("Accept", "application/json");
        xmlReq.setRequestHeader("Authorization", "Basic " + window.btoa(username + ":" + password));
        xmlReq.send();
        if (xmlReq.status = "200") {
            var authenticated = Ext.decode(xmlReq.responseText).authenticated;
            if (authenticated) {
                localStorage.setItem("basicAuthHeader", "Basic " + window.btoa(username + ":" + password));
            } else {
                localStorage.removeItem("basicAuthHeader");
            }
        }
    },

    /**
     * Returns all the modules in Raxa
     * @return [ 'login', 'screener', ....]
     */
    getModules: function () {
        //always keep login at first position as its app path is different
        return ['login', 'screener', 'registration', 'registrationextjs4', 'pharmacy', 'chw', 'outpatient', 'laboratory', 'patientfacing'];
    },

    getApps: function () {
        //always keep login at first position as its app path is different
        return ['gotStatins', 'problemList'];
    },
    /**
     *Generate six digit randomly generated Device Id  
     *Checks if any key with name "deviceId" is previously stored in localStorage, returns it if availaible
     *@return deviceId
     *
     */
    getDeviceId: function () {
        var deviceId;
        //Checks if localStorage already has deviceId stored in it        
        if (localStorage.getItem("deviceId") == null) {
            var randomNumber = [];
            for (var i = 0; i < 6; i++) {
                //generates random digit from 0 to 10
                randomNumber[i] = (Math.floor(Math.random() * 10));
            }
            deviceId = randomNumber.join('');
            localStorage.setItem("deviceId", deviceId);
            console.log('6-digit randomly generated Device Id: ' + deviceId + ' & is stored in localStorage');

        } else {
            // gets the value of deviceId if available in localStorage 
            deviceId = localStorage.getItem("deviceId");
            console.log('6-digit randomly generated Device Id that was stored in localStorage:' + deviceId);
        }
        return deviceId;
    },/*
     * gets the Patient Identifier generated by the IDGen Module
     * Note: The Identifier type must be the 3rd in the list (ie at position 2) for this to work properly.
     */
    getPatientIdentifier: function () {
        //TODO: add this back in once ID Gen is working properly
        //https://raxaemr.atlassian.net/browse/JLM-45 (is accidentally a JLM issue)
        //        var patientIDRequest = new XMLHttpRequest();
        //        patientIDRequest.open("GET", HOST + '/module/idgen/generateIdentifier.form?source=1&comment=New%20Patient', false);
        //        patientIDRequest.setRequestHeader("Accept", "*/*");
        //        patientIDRequest.send();
        //        if (patientIDRequest.status = "200") {
        //            var pid = patientIDRequest.responseText;
        //            return pid;
        //        } else {
        //            console.log('ERROR Code on creating patient identifier: ' + patientIDRequest.status);
        //        }
        return (Math.floor(Math.random()*1000000)).toString();
    },

    //Function to help share Models between ExtJS and Sencha Touch 2
    platformizeModelConfig: function (extJsModelConfig) {
        if (Ext.versions.extjs) {
            return extJsModelConfig; // nothing to change, we are on ext
        } else if (Ext.versions.touch) {
            // transform to Sencha Touch 2 data model
            var config = {
                extend: extJsModelConfig.extend,
                config: extJsModelConfig
            };
            delete config.config.extend;
            return config;
        } else {
            Ext.Error.raise('Could not recognize Library');
        }
    },
    getPatientIdentifier : function(){
        //dummy funtion to be used for creating partient
        // TODO: writen a  ramdom no for patient identufier but it should be a unique id
        return Math.floor(Math.random() * 1000000000);
    },

    getAttributeFromREST: function (resource, queryParameter, display) {
        //Ajax Request to get Height / Weight / Bmi Attribiutes from Concept Resource
        Ext.Ajax.request({
            url: HOST + '/ws/rest/v1/' + resource + '?q=' + queryParameter, //'/ws/rest/v1/concept?q=height',
            method: 'GET',
            disableCaching: false,
            headers: Util.getBasicAuthHeaders(),
            failure: function (response) {
                console.log('GET failed with response status: ' + response.status); // + response.status);
            },
            success: function (response) {
                for (var i = 0; i < JSON.parse(response.responseText).results.length; ++i) {
                    if (JSON.parse(response.responseText).results[i].display == display) {
                        if (resource != 'location') {
                            localStorage.setItem(queryParameter + "Uuid" + resource, JSON.parse(response.responseText).results[i].uuid)
                        } else {
                            localStorage.setItem(queryParameter + "Uuid" + resource, display)
                        }
                    }
                }
            }
        });
    },

    getProviderUuid: function (uuid) {
        //Ajax Request to get Height / Weight / Bmi Attribiutes from Concept Resource
        Ext.Ajax.request({
            url: HOST + '/ws/rest/v1/provider/' + uuid, //'/ws/rest/v1/concept?q=height',
            method: 'GET',
            disableCaching: false,
            headers: Util.getBasicAuthHeaders(),
            failure: function (response) {
                console.log('GET failed with response status: ' + response.status); // + response.status);
            },
            success: function (response) {
                var x = "person not exits"
                if (JSON.parse(response.responseText).person.uuid != null) {
                    return JSON.parse(response.responseText).person.uuid
                } else {
                    return x
                }
            }
        });
    }
}