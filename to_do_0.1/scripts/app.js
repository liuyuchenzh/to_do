/**
 * Project: to_do
 * Author: Yuchen Liu
 * Version: 0.1
 * Liscence: None
 * Note: 1. The "gevent" service COULD be dropped and use factory instead
 *       for each "global event hanlder" below. The arg called "context" could be
 *       then replaced by $scope. And using factory is probably the better idea
 *       bc gevent is still the pure js development logic.
 *       2. For this time being (learning angular for 3 days), I still prefer to
 *       use "this" over "$scope" bc it would make it easier for myself to tell
 *       where (which controller) the sepecific property or function could be found
 *       and modified when looking at the markups.
 *       3. Tried to use ngModelOptions but it may cause one little problem.
 *       The validation won't work since validation only starts when data is
 *       binded and ngModelOptions postpones the binding process.
 *       Stick with fakeData for now.
 *       5. Should use angular's valiation directive instead of making a new one!
 *       Intend to do so in 0.2 version.
 *
**/

angular.module("toDoList", [])
.controller("listController", ["gevent", "convertDate", "checkName", "checkDate",
  "setDisabled",
  function (gevent, convertDate, checkName, checkDate, setDisabled) {
	var that = this;
	this.data = {
		lists: []
	};

  this.fakeData = {};

	this.state = {
		formShow: false,
		compiling: false,
    sortMethod: "dateModified",
    aOrD: "a"
	};

	this.config = {
		listKey: /^list\d+/g
	};
	//--------- local event handler ---------------------------------------
	// begin event handler /formToggle/
	this.formToggle = function () {
		if (this.state.formShow) {
			alert("Still in the middle of making a new list!");
			return false;
		}
		this.state.formShow = true;
	};
	// end event handler /formToggle/

	// begin event handler /manageList/
	this.manageList = function () {
		this.state.compiling = true;
    // save a copy of data
    // will be used during compiling phase
    // if user does not click save
    // fake(copy) data value will be used to replace the data that is unsaved but
    // binded to the formController
    // when user click "done"
    angular.copy(that.data, that.fakeData);
    gevent.fire("hideForm");
	};
	// end event handler /manageList/

	// begin event handler /stopManageList/
	this.stopManageList = function () {
		gevent.fire("stopManageList");
		this.state.compiling = false;
	};
	// end event handler /stopManageList/

	// begin event handler /removeList/
	this.removeList = function (id) {
		var lists = this.data.lists;
		for (var i = 0, len = lists.length; i < len; i++) {
			var list = lists[i];

			if (list.id === id) {
				lists.splice(i, 1);
				removeListOnStorage(id);
				break;
			}
		}

		lists.length === 0 && this.stopManageList();
	}
	// end event handler /remvoeList/

	// begin event handler /updateStorage/
	this.updateStorage = function(list) {
    var id = list.id;
    var index = findListInCtrl(id, false);
    var time = Date.now();
    var key = "list" + time;
    list.modifiedDate = time;
    list.taskDate = convertDate(list.taskDate);
		var val = JSON.stringify(list);

    gevent.fire("manageList", {
      removeListOnStorage: [id],
      disableListInput: [list],
      __setDisabled: [false, list],
      updateFakeData: [index, list]
    }, true);

    window.localStorage.setItem(key, val);

    // "modified" will be used to check whether fakdData should be used
    // place this step here means list on localStorage will never set its
    // "modified" property true. In fact, the "modified" property is rather
    // false or undefined as no-exist (falsy value)
    list.modified = true;
	}
	// end event handler /updateStorage/

	// begin event handler /startEditList/
	this.startEditList = function(list) {
		list.compiling = true;
    // change property "modified" into false again
    // therefore even if the list was saved before, as long as user click edit,
    // the list will be treated as never been modified before
    // if user click save after
    // the "modified" property will be saved on localStorage with value of false
    setModified(false, list);
    // enable "save" button
    setDisabled(true, list);
	}
	// end event hanlder /startEditList/

  // begin event hanlder /checkName/
  this.checkName = function(list) {
    checkName(list);
  }
  // end event handler /checkName/

  // begin event handler /checkDate/
  this.checkDate = function(list) {
    checkDate(list);
  }
  // end event handler /checkDate/

  // begin event handler /sortList/
  this.sortList = function() {
    var method = this.state.sortMethod;
    sortList(method, undefined, this.data.lists);
  }
  // end event handler /sortList/

  // begin event handler /setAorD/
  this.setAorD = function() {
    var aOrD = this.state.aOrD;
    sortList(undefined, aOrD, this.data.lists);
  }
  // end event hanlder /setAorD/
	//--------- end local event handler------------------------------------


	//--------- global event handler --------------------------------------
	// begin event handler /updateData/
	function updateData(data) {
		var index = checkList(data);
    var key = "list" + Date.now();
    var val;

    if (index === -1) {
      that.data.lists.push(data);
      val = JSON.stringify(data);
      window.localStorage.setItem(key, val);
    } else {
      list = that.data.lists[index];
      if (list.taskDescr !== undefined) {
        list.taskDescr += "\n" + data.taskDescr;
      } else {
        list.taskDescr = data.taskDescr;
      }

      list.taskDate = data.taskDate;
      list.modifiedDate = data.modifiedDate;
      // remove the old value on localStorage
      removeListOnStorage(list.id);

      val = JSON.stringify(list);
      window.localStorage.setItem(key, val);
    }
  }

	// end event handler /updateData/

	// begin event hanlder /hideForm/
	function hideForm() {
		that.state.formShow = false;
	}
	// end event handler /hideForm/

	// begin event handler /disableListInput/
	function disableListInput(list) {
		var lists = that.data.lists;
		var id = list.id;
		var index = findListInCtrl(id, true);
		lists[index].compiling = false;
		return;
	}
	// end event handler /disableListInput/

	// begin event handler /resetListCompiling/
	function resetListCompiling() {
		var lists = that.data.lists;
		for (var i = 0, len = lists.length; i < len; i++) {
			var list = lists[i];
			list.compiling = true;
		}
	}
	// end event handler /resetListCompiling/

  // begin event hanlder /resetUnmodified/
  function resetUnmodified() {
    var lists = that.data.lists;
    var fakeLists = that.fakeData.lists;
    for (var i = 0, len = lists.length; i < len; i++) {
      if (!lists[i].modified) {
        lists[i] = fakeLists[i];
      }
      // reset modified property to all list
      // in other words, modified is only useful under manage mode
      // it's a temp property
      lists[i].modified = undefined;
    }
  }
  // end event handler /resetUnmodified/

  // begin event handler /resetDisabled/
  function resetDisabled() {
    var lists = that.data.lists;
    for (var i = 0, len = lists.length; i < len; i++) {
      setDisabled(true, lists[i]);
    }
  }
  // end event handler /resetDisabled/
	//--------- end global event handler ----------------------------------

	//--------- local utility function ------------------------------------------
	// begin /findListOnStorage/
	function findListOnStorage(id) {
		for (var key in window.localStorage) {
			if (key.indexOf("list") === 0) {
				if (window.localStorage[key].indexOf(id) > -1) {
					return key;
				}
			}
		}
	}
	// end /findListOnStorage/

	// begin /removeListOnStorage/
	function removeListOnStorage(id) {
		var key = findListOnStorage(id);
		window.localStorage.removeItem(key);
	}
	// end /removeListOnStorage/

	// begin /findListInCtrl/
	function findListInCtrl(id, realOrFake) {
		var lists;
    realOrFake ? (lists = that.data.lists) : (lists = that.fakeData.lists);
		for (var i = 0, len = lists.length; i < len; i++) {
			if (lists[i].id === id) {
				return i;
			}
		}
	}
	// end /findListInCtrl/

	// begin /checkAndUpdateList/
	function checkList(data) {
		for (var i = 0, len = that.data.lists.length; i < len; i++) {
			var list = that.data.lists[i];
			// when add a list that has the same taskName as an old list
			if (data.taskName === list.taskName && data.id !== list.id) {
				// return index
        return i;
      }
    }
    // no duplicate, then return -1 indicating such
    return -1;
	}
	// end /checkAndUpdateList/

  // begin /setModified/
  function setModified(val, list) {
    list.modified = val;
  }
  // end /setModified/

  // begin /updateFakeData/
  function updateFakeData(index, list) {
    // make sure the change of list won't effect fakeData
    that.fakeData.lists[index] = list;
  }
  // end /updateFakeData/

  // begin /sortMethod/
  var sortMethod = {
    dateCreated: function(a, b) {
      return a.id - b.id;
    },
    dateModified: function(a, b) {
      return a.modifiedDate - b.modifiedDate;
    },
    taskDate: function(a, b) {
      var taskDateA = new Date(a.taskDate.year, a.taskDate.month + 1, a.taskDate.day);
      var taskDateB = new Date(b.taskDate.year, b.taskDate.month + 1, b.taskDate.day);
      return taskDateA - taskDateB;
    }
  };
  // end /sortMethod/

  // begin /sortList/
  var sortList = (function() {
    var _method = "dateModified";
    var _aOrD = "a";

    var _sortList = function(method, aOrD, lists) {
      // if user set method, then use it
      // or use the default or last time used _method
      method = method || _method;
      // update _method
      _method = method;

      if (aOrD === undefined) {
        aOrD = _aOrD;
      } else {
        // update _aOrD
        _aOrD = aOrD;
      }
      console.log("before", lists);

      lists.sort(sortMethod[method]);
      aOrD === "d" && lists.reverse();
      console.log("after", lists);
    }

    return _sortList;
  }());
  // end /sortList/
	//--------- end local utility function --------------------------------------

	//--------- initiate controller ---------------------------------------
	(function () {

		for (var key in localStorage) {
			if (key.indexOf("list") === 0) {
				that.data.lists.push(JSON.parse(localStorage[key]));
			}
		}
    // assign new name for the service, which is used as function
    function __setDisabled() {
      setDisabled.apply(this, arguments);
    }

		gevent.subscribe("updateList", updateData);
		gevent.subscribe("hideForm", hideForm);
    // no arguments needed
		gevent.subscribe("stopManageList", resetListCompiling, resetUnmodified,
      resetDisabled);
    // complex arguments needed
    gevent.subscribe("manageList", removeListOnStorage, disableListInput,
      __setDisabled, updateFakeData);

	} ())
}])
.controller("formController", ["gevent", "convertDate", "checkName", "checkDate",
  "validation",
  function (gevent, convertDate, checkName, checkDate, validation) {
	var that = this;

	this.config = {
		dateRegexp: /(\d{4})?.*(\d{2})?.*(\d{2})?/g,
    mustValid: ["taskName"]
	};

	this.data = {
		taskDate: {}
	};

	this.state = {
		disabled: true,
    yearErr: false,
    monthErr: false,
    dayErr: false,
    nameErr: false
	};

	//--------- local event handler ---------------------------------------
	// begin event handler /submit/
  this.submit = function () {
		var date = that.data.taskDate;
    var time = Date.now();

		that.data.taskDate = convertDate(date);
		// add unique id to each data
    // also add modifedDate prop to data
    // in this case, the two values are the same
		that.data.id = that.data.modifiedDate = time;
		// add compiling property to data
		// set it to true
    // when compiling is true it means user is compiling that specific list
    // under manage mode
		that.data.compiling = true;
    // add disabled property to data
    // set it to false
    // when disabled is false it means the value user provide is valid
    // under manage mode
    that.data.disabled = false;

    that.data.mustValid = that.config.mustValid;

		gevent.fire("updateList", that.data);

		this.clear();
		return false;
	};
	// end event handler /submit/


	// begin event handler /clear/
	this.clear = function () {
		this.data = {
			taskDate: {}
		};
		// doesn't feel right
		gevent.fire("hideForm");
		this.state.disabled = true;
	};
	// end event handler /clear/

	// begin event handler /checkDate/
	this.checkDate = function (context) {
    // in formController, no context will be passed into this function
    // therefore context will be this
    context = context || this;

    // it's true that in formController there is no need to invoke gevent.fire
    // invoking checkDate function directly would be faster and easier
    // but just want to keep the style consistent
    // since checkDate event is not limited to formController
    /*
    gevent.fire("checkDate", context);
    */
    checkDate(context);
  };
	// end event handler /checkDate/

	// begin event handler /checkName/

	this.checkName = function (context) {
    // in formController, no context will be passed into this function
    // therefore context will be this.data
    context = context || this;
    /*
    gevent.fire("checkName", context);
    */
    checkName(context);
	};
	// end event hander /checkName/
	//--------- end local event handler -----------------------------------

  //--------- initiate controller ---------------------------------------
  (function() {
    // reset count in validation when hideForm
    gevent.subscribe("hideForm", validation);
  }())
  //--------- end initiate controller -----------------------------------
}])
.factory("gevent", (function () {
	var cache = {};

	function subscribe(type, callback) {
    var _callback;

    if (!cache[type]) {
			cache[type] = [];
		}
    // used to get function's name
    function Base(fn) {
      name = this.getFnName(fn);
      this.fn = fn;
      this.name = name;
    };

    Base.prototype = {
      getFnName: function(fn) {
        var fnStr = fn.toString();
        var regExp = /^function\s+([_\w\$]+)\s*\(/g;
        var match = regExp.exec(fnStr);
        !match && (match = ["", "anony"]);
        return match[1];
      }
    }

    if (Object.prototype.toString.call(callback) !== "[object Array]") {
      callback = [].slice.call(arguments, 1);
    }
    for (var i = 0, len = callback.length; i < len; i++) {
      _callback = new Base(callback[i]);
      cache[type].push(_callback);
      // cache[type].push(callback[i]);
    }

		return true;
	}

	function fire(type) {
    var data;

    if (!cache[type]) {
			throw new Error("no " + type + " type of event has been subscribed yet!");
			return false;
		}
    // if callbacks have very different arguments
    // use a plain object as map
    // the third arguments has to be passed and set to true to trigger this
    if (arguments.length === 3 &&
      Object.prototype.toString.call(arguments[1]) === "[object Object]" &&
      arguments[2] === true) {
      data = arguments[1];
      for (var i = 0, len = cache[type].length; i < len; i++) {
        var found = false;
        for (key in data) {
          if (!Object.prototype.hasOwnProperty.call(data, key)) {
            continue;
          }
          if (cache[type][i]["name"] === key) {
            Object.prototype.toString.call(data[key]) !== "[object Array]" &&
              (data[key] = [data[key]]);
            cache[type][i]["fn"].apply(null, data[key]);
            found = true;
            break;
          }
        }
        if (!found) {
          cache[type][i]["fn"].apply(null);
        }
      }
    } else {
      // if callbacks share the same arguments (could be the case no args needed)
      data = [].slice.call(arguments, 1);
      !data && (data = []);

  		for (var i = 0, len = cache[type].length; i < len; i++) {
  			cache[type][i]["fn"].apply(this, data);
  		}
    }

		return true;
	}

	function remove(type, fn) {
		if (!cache[type]) {
			throw new Error("no " + type + " type of event has been subscribed yet!");
			return false;
		}

		var removeOneFn = (typeof fn === "function");

		if (removeOneFn) {
			for (var i = 0, len = cache[type].length; i < len; i++) {
				if (cache[type][i] === fn) {
					cache[type].splice(i, 1);
					return true;
				}
			}
			throw new Error("function not found");
		} else {
			cache[type] = undefined;
		}
	}

	return function () {
		return {
			subscribe: subscribe,
			fire: fire,
			remove: remove
		};
	};
} ()))
.factory("convertDate", function() {
  return function(date) {
    var year = date.year,
			month = date.month,
			day = date.day;

		var today = new Date(Date.now());
		year = year || today.getFullYear();
		month = month || today.getMonth() + 1;
		day = day || today.getDate();

		return {
			year: year,
			month: month,
			day: day
		};
  };
})
.factory("setContext", function() {
  return function(context, key) {
    if (context[key] !== undefined) {
      return context[key];
    } else {
      return context;
    }
  }
})
.factory("checkName", ["setContext", "validation", "setNameErr",
  function(setContext, validation, setNameErr) {
  return function(context) {
    var ret = false;
    var taskName = "";
    var temp_context = setContext(context, "data");
    taskName = temp_context.taskName;
    if (taskName !== "") {
			ret = true;
		}
    /*
		gevent.fire("checkAllInput", "taskName", ret, context);
    gevent.fire("setNameErr", ret, context);
    */
    validation("taskName", ret, context);
    setNameErr(ret, context);
  };
}])
.factory("checkDate", ["setContext", "validation", "setDateErr",
  function(setContext, validation, setDateErr) {
  return function(context) {
    var temp_context = setContext(context, "data");
    var year = temp_context.taskDate.year,
			month = temp_context.taskDate.month,
			day = temp_context.taskDate.day;
		var ret = true;
    var err_obj = {
      yearErr: false,
      monthErr: false,
      dayErr: false
    };

		// could be written as
		// year && (year > 9999 && (ret = false))
		// but hard to read
		if (year) {
			if (isNaN(year) || year % 1 !== 0 || year < 0 || year > 9999) {
        ret = false;
        err_obj.yearErr = true;
      }
		}
		if (month) {
			if (isNaN(month) || month % 1 !== 0 || month < 1 || month > 12) {
        ret = false;
        err_obj.monthErr = true;
      }
		}
		if (day) {
			if (isNaN(day) || day % 1 !== 0 || day < 1 || day > 31) {
        ret = false;
        err_obj.dayErr = true;
      }
		}
    /*
		gevent.fire("checkAllInput", "taskDate", ret, context);
    gevent.fire("setDateErr", err_obj, context);
    */
    validation("taskDate", ret, context);
    setDateErr(err_obj, context);
	};
}])
.factory("validation", ["setContext", "setDisabled",
  function(setContext, setDisabled) {
  return (function () {
		// one thing needs to be improved
		// for the second time to add a list
		// the initial "disabled" state of sumbimit button would be false
		// for now the fix is added in this.submit method
		var cache = {};
		var _validation = function (type, valid, context) {
      var done = true;
      // reset count
			// invoke when fire hideForm
			if (!type) {
				cache = {};
				return;
			}

			if (!cache[type]) {
				cache[type] = {
					oldVal: false
				};
			}

			cache[type]["oldVal"] = valid;

			for (var key in cache) {
				if (!cache[key]["oldVal"]) {
					done = false;
				}
			}

      var temp_context = setContext(context, "config");
      var mustValidArr = temp_context.mustValid;
      // only check the mustValid first when adding a new list
      // assume mustValid is met when editing list starts
      if (context !== temp_context) {
        for (var i = 0, len = mustValidArr.length; i < len; i++) {
          if (cache[mustValidArr[i]] === undefined) {
            done = false;
            break;
          }
        }
      }
      /*
			gevent.fire("setDisabled", done, context);
      */
      setDisabled(done, context);
		}

		return _validation;
	} ())
}])
.factory("setDisabled", ["setContext", function(setContext) {
  return function(done, context) {
    var temp_context = setContext(context, "state");
    done ? temp_context.disabled = false : temp_context.disabled = true;
  };
}])
.factory("setNameErr", ["setContext", function(setContext) {
  return function(valid, context) {
    var temp_context = setContext(context, "state");
    temp_context.nameErr = !valid;
  };
}])
.factory("setDateErr", ["setContext", function(setContext){
  return function(err_obj, context) {
    var temp_context = setContext(context, "state");
    for (var key in err_obj) {
      temp_context[key] = err_obj[key];
    }
  };
}])
