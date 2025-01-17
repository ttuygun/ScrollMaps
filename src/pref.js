/*global $ console */

var PrefManager = {};
var Pref = PrefManager;

function pref(label){
    return PrefManager.getOption(label);
}

(function(){

	const defaults = {
        'enabled': true,
        'invertScroll': false,
        'invertZoom': false,
        'isolateZoomScroll': true,
        'frameRequireFocus': true,
        'scrollSpeed': 200,
        'zoomSpeed': 250
	};

    const listeners = [];

	function getDefault(label) {
        return defaults[label];
	}

	function getOptions() {
		var opt = localStorage['options'];
		if (!opt) return false;
		var options = JSON.parse(opt);
		if (!options) return false;
		return options;
	}

    PrefManager.getAllOptions = function() {
        return getOptions();
    };

	PrefManager.setOption = function(key, value) {
		let options = getOptions();
		if (!options) options = {};
        if (options[key] === value) return;
		options[key] = value;
		localStorage['options'] = JSON.stringify(options);
        for (const listener of listeners) {
            listener(key, value);
        }
		console.log('Options saved');
	};

	PrefManager.getOption = function(key) {
		let options = getOptions();
		if (!options) return getDefault(key);
		const output = options[key];
		if (output === undefined)
			return getDefault(key);
		return output;
	};

    PrefManager.onPreferenceChanged = function(key, func) {
        listeners.push((changedkey, changedvalue) => {
            if (changedkey === key) func(changedkey, changedvalue);
        });
    };

    // support for PrefReader which reads preferences from content scripts (which do not have access
    // to localStorage of the extension)

    listeners.push((key, value) => {
        Extension.forAllTabs(function (tab) {
            const pair = {key: key, value: value};
            Message.tab.sendMessage(tab, 'preferenceChanged', pair, (result) => {
                let error = chrome.runtime.lastError;
                let errorMessage = error ? error.message : undefined;
                if (errorMessage && errorMessage.indexOf('Receiving end does not exist') === -1) {
                    console.warn(errorMessage);
                }
            });
        });
    });

    Message.extension.addListener(function(action, data, sender, sendResponse) {
        switch(action) {
            case 'setPreference':
                PrefManager.setOption(data.key, data.value);
                break;
            case 'getAllPreferences':
                var allOptions = $.extend(defaults, PrefManager.getAllOptions());
                sendResponse(allOptions);
                break;
        }
    });

})();
