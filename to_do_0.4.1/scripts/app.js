/**
 * Project: to_do
 * Author: Yuchen Liu
 * Version: 0.4.1
 * Liscence: None
 * Note: 1. Use service to provide data saving instead of own property of
 *       controller (aka this.data). Though original goal was to use service
 *       to share data cross controller.
 *       2. Add selectAll for compiling mode.
 *       3. Rewrite the sortList function, which is shorter and makes better
 *       sense now.
 *       4. Resort after restore/update and sort immediately after initiation.
 *       5. Add styles for selectAll block.
 *       6. Fix losing data bug.
 *
**/

angular.module("toDoList", [])
.controller("listController", ["gevent", "convertDate", "setDisabled",
  "removeListOnStorage", "listData", "selectAll", "checkAll",
  "removeMultiLists", "createKey", "$scope",
  function (gevent, convertDate, setDisabled, removeListOnStorage, listData,
    selectAll, checkAll, removeMultiLists, createKey, $scope) {
	var that = this;
  $scope.listData = listData;

	this.state = {
		formShow: false,
		display: true,
    trashCanShow: false,
    compiling: false,
    all: false,
    sortMethod: "dateModified",
    aOrD: "a",
    oneSelected: false
	};

	this.config = {
    listKey: "list"
	};

  $scope.resetViewValue = true;

	//--------- local event handler ---------------------------------------
  // begin event hanlder /display/
  this.display = function() {
    this.state.display = true;
    this.state.trashCanShow = false;
  }
  // end event hanlder /display/

  // begin event hanlder /goToTrashCan/
  this.goToTrashCan = function() {
    this.state.trashCanShow = true;
    this.state.display = false;
    this.state.formShow = false;
    this.state.compiling = false;
  }

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
    if (listData.lists.length === 0) {
      return;
    }
    $scope.resetViewValue = false;
		this.state.compiling = true;
    // save a copy of data
    // will be used during compiling phase
    // if user does not click save
    // fake(copy) data value will be used to replace the data that is unsaved but
    // binded to the formController
    // when user click "done"
    gevent.fire("hideForm");
	};
	// end event handler /manageList/

	// begin event handler /stopManageList/
	this.stopManageList = function () {
		gevent.fire("stopManageList");
		this.state.compiling = false;
    this.state.display = true;
    $scope.resetViewValue = true;
	};
	// end event handler /stopManageList/

	// begin event handler /removeList/
	this.removeList = function (id) {
		var lists = listData.lists;
		for (var i = 0, len = lists.length; i < len; i++) {
			var list = lists[i];

			if (list.id === id) {
        lists.splice(i, 1);
        removeListOnStorage(id, that.config.listKey);
        // update data in trash can
        // important to invoke this event after remove list on localStorage
        // since the id of the list as "trashed list" won't change
        gevent.fire("moveToTrash", list);
				break;
			}
		}

		lists.length === 0 && this.stopManageList();
	}
	// end event handler /remvoeList/

	// begin event handler /updateStorage/
	this.updateStorage = function(list) {
    var id = list.id;
    var index = findListInCtrl(id);
    var time = Date.now();
    var key = createKey(that.config.listKey);
    list.modifiedDate = time;
    list.taskDate = convertDate(list.taskDate);
		var val = JSON.stringify(list);
    // val has to be cached first therefore the following function won't
    // affect the property of new list
    gevent.fire("manageList", {
      removeListOnStorage: [id, that.config.listKey],
      disableListInput: [list],
      __setDisabled: [false, list]
    }, true);
    // save list on localStorage must be the last step
    // since the new list has the same id as the old one
    // removeListOnStorage removes list based on id therefore may remove new one
    // if the saving happens before removing
    window.localStorage.setItem(key, val);
	}
	// end event handler /updateStorage/

	// begin event handler /startEditList/
	this.startEditList = function(list) {
		list.compiling = true;
    setDisabled(true, list);
	}
	// end event hanlder /startEditList/

  // begin event handler /sortList/
  this.sortList = function() {
    sortList(listData.lists);
  }
  // end event handler /sortList/

  // begin event hanlder /restore/
  this.restore = function() {
    this.state.trashCanShow = false;
    this.state.display = true;
    gevent.fire("restore");
    // resort lists after restore
    sortList(listData.lists);
  }

  // begin event hanlder /removeTrash/
  this.removeTrash = function() {
    this.state.trashCanShow = false;
    this.state.display = true;
    gevent.fire("removeTrash");
  }
  // end event handler /removeTrash/

  // begin event hanlder /updateChecked/
  this.updateChecked = function(list) {
    list.checked = !!!list.checked;
    checkAll(this, listData.lists, "checked");
    checkForOne();
  }
  // end event hanlder /updateChecked/

  // begin event handler /selectAll/
  this.selectAll = function() {
    selectAll(this, listData.lists, "checked");
    checkForOne();
  }
  // end event handler /selectAll/

  // begin event handler /removeMultiLists/
  this.removeMultiLists = function() {
    removeMultiLists(this, listData.lists, "checked", function(list) {
      list.checked = undefined;
      gevent.fire("moveToTrash", list);
    });
    resetStateAll();
    checkForOne();
  }
  // end event handler /checkAll/
	//--------- end local event handler------------------------------------


	//--------- global event handler --------------------------------------
	// begin event handler /updateData/
	function updateData(data) {
		var index = checkList(data);
    var key = createKey(that.config.listKey);
    var val;

    if (index === -1) {
      listData.lists.push(data);
      val = JSON.stringify(data);
      window.localStorage.setItem(key, val);
    } else {
      list = listData.lists[index];
      if (list.taskDescr !== undefined) {
        list.taskDescr += "\n" + data.taskDescr;
      } else {
        list.taskDescr = data.taskDescr;
      }

      list.taskDate = data.taskDate;
      list.modifiedDate = data.modifiedDate;
      // remove the old value on localStorage
      removeListOnStorage(list.id, that.config.listKey);

      val = JSON.stringify(list);
      window.localStorage.setItem(key, val);
    }
    // sort list after add a new one or update an old one
    sortList(listData.lists);
  }

	// end event handler /updateData/

	// begin event hanlder /hideForm/
	function hideForm() {
		that.state.formShow = false;
	}
	// end event handler /hideForm/

	// begin event handler /disableListInput/
	function disableListInput(list) {
		var lists = listData.lists;
		var id = list.id;
		var index = findListInCtrl(id);
		lists[index].compiling = false;
		return;
	}
	// end event handler /disableListInput/

	// begin event handler /resetListCompiling/
	function resetListCompiling() {
		var lists = listData.lists;
		for (var i = 0, len = lists.length; i < len; i++) {
			var list = lists[i];
			list.compiling = true;
		}
	}
	// end event handler /resetListCompiling/

  // begin event handler /resetDisabled/
  function resetDisabled() {
    var lists = listData.lists;
    for (var i = 0, len = lists.length; i < len; i++) {
      setDisabled(true, lists[i]);
    }
  }
  // end event handler /resetDisabled/
	//--------- end global event handler ----------------------------------

	//--------- local utility function ------------------------------------------
	// begin /findListInCtrl/
	function findListInCtrl(id) {
		var lists = listData.lists;
		for (var i = 0, len = lists.length; i < len; i++) {
			if (lists[i].id === id) {
				return i;
			}
		}
	}
	// end /findListInCtrl/

	// begin /checkAndUpdateList/
	function checkList(data) {
		for (var i = 0, len = listData.lists.length; i < len; i++) {
			var list = listData.lists[i];
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
      return taskDateA - taskDateB !== 0 ?
        taskDateA - taskDateB :
        a.id - b.id;
    }
  };
  // end /sortMethod/

  // begin /sortList/
  function sortList(lists) {
    method = that.state.sortMethod;
    aOrD = that.state.aOrD;

    lists.sort(sortMethod[method]);
    aOrD === "d" && lists.reverse();
  }
  // end /sortList/

  // begin /resetStateAll/
  function resetStateAll() {
    that.state.all = false;
  }
  // end /resetStateAll/

  // begin /checkForOne/
  function checkForOne() {
    if (!listData.lists.length) {
      return that.state.oneSelected = false;
    }
    for (var i = 0; i < listData.lists.length; i++) {
      var list = listData.lists[i];
      if (list.checked) {
        that.state.oneSelected = true;
        return;
      }
    }
    that.state.oneSelected = false;
  }
  // end /checkForOne/
	//--------- end local utility function --------------------------------------

	//--------- initiate controller ---------------------------------------
	(function () {

		for (var key in localStorage) {
			if (key.indexOf(that.config.listKey) === 0) {
				listData.lists.push(JSON.parse(localStorage[key]));
			}
		}
    // sort list immediately
    sortList(listData.lists);
    // assign new name for the service, which is used as function
    function __setDisabled() {
      setDisabled.apply(this, arguments);
    }

		gevent.subscribe("updateList", updateData);
		gevent.subscribe("hideForm", hideForm);
    // no arguments needed
		gevent.subscribe("stopManageList", resetListCompiling, resetDisabled);
    // complex arguments needed
    gevent.subscribe("manageList", removeListOnStorage, disableListInput,
      __setDisabled);

	} ())
}])
.controller("formController", ["gevent", "convertDate", "listData", "$scope",
  function (gevent, convertDate, listData, $scope) {
	var that = this;

	this.config = {
		data: {
      taskDate: {}
    }
	};

	this.data = {
    taskDate: {}
  };

	this.state = {
		disabled: true
	};

  // for the delay check of required input
  $scope.ycDelayRequiredError = false;
  $scope.okToValid = false;

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

    // this is cross-controller data passing, not recommended by angular
    gevent.fire("updateList", that.data);

		this.clear();
		return false;
	};
	// end event handler /submit/


	// begin event handler /clear/
	this.clear = function () {
		gevent.fire("hideForm");
	};
	// end event handler /clear/
	//--------- end local event handler -----------------------------------

  //--------- begin global event handler --------------------------------
  // begin event handler /clearForm/
  function clearForm() {
    that.data = {
      taskDate: {}
    };
  }
  // end event handler /clearForm/

  // begin event handler /resetDelayRequired/
  function resetDelayRequired() {
    $scope.ycDelayRequiredError = false;
    $scope.okToValid = false;
  }
  // end event handler /resetDelayRequired/
  //--------- end global event handler ----------------------------------

  //--------- initiate controller ---------------------------------------
  (function() {
    // reset count in validation when hideForm
    gevent.subscribe("hideForm", clearForm, resetDelayRequired);
  }())
  //--------- end initiate controller -----------------------------------
}])

.controller("trashCanController", ["gevent", "removeListOnStorage", "listData",
  "selectAll", "checkAll", "removeMultiLists", "createKey", "$scope",
  function(gevent, removeListOnStorage, listData, selectAll, checkAll,
    removeMultiLists, createKey, $scope) {
  var that = this;

  this.config = {
    listKey: "__list"
  };

  this.state = {
    all: false
  };

  //--------- local event handler ---------------------------------------
  // begin event handler /selectAll/
  this.selectAll = function() {
    selectAll(this, listData.trashLists, "tChecked");
  }
  // end event handler /selectAll/

  // begin event handler /checkAll/
  this.checkAll = function() {
    checkAll(this, listData.trashLists, "tChecked");
  }
  // end event handler /checkAll/
  //--------- global event handler --------------------------------------
  // begin event hanlder /updateTrash/
  function updateTrash(list) {
    listData.trashLists.push(list);
  }
  // end event handler /updateTrash/

  // begin event handler /updateTrashOnLS/
  function updateTrashOnLS(list) {
    var key = createKey(that.config.listKey);
    var val = JSON.stringify(list);
    window.localStorage.setItem(key, val);
  }
  // end event handler /updateTrashOnLS/

  // begin event handler /removeTrash/
  function removeTrash() {
    removeMultiLists(that, listData.trashLists, "tChecked");
  }
  // end event handler /removeTrash/

  // begin event handler /restore/
  function restore() {
    removeMultiLists(that, listData.trashLists, "tChecked", function(list) {
      resetTchecked(list);
      gevent.fire("updateList", list);
    });
  }
  // end event handler /restore/
  //--------- end global event handler ----------------------------------

  //--------- local utility function ------------------------------------
  // begin /resetStateAll/
  function resetStateAll() {
    that.state.all = false;
  }
  // end /resetStateAll/

  // begin /resetTchecked/
  function resetTchecked(list) {
    list.tChecked = undefined;
  }
  // end /resetTchecked/
  //--------- end local utility function --------------------------------

  //--------- initiate controller ---------------------------------------
  (function() {
    // read trashed-list on localStorage
    for (key in window.localStorage) {
      if (key.indexOf(that.config.listKey) === 0) {
        listData.trashLists.push(JSON.parse(window.localStorage[key]));
      }
    }

    gevent.subscribe("moveToTrash", updateTrash, updateTrashOnLS);
    gevent.subscribe("removeTrash", removeTrash, resetStateAll);
    gevent.subscribe("restore", restore, resetStateAll)
  }())
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

    // angular has its own angular.isArray() and angular.isObject()
    if (Object.prototype.toString.call(callback) !== "[object Array]") {
      callback = [].slice.call(arguments, 1);
    }
    for (var i = 0, len = callback.length; i < len; i++) {
      _callback = new Base(callback[i]);
      cache[type].push(_callback);
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
.factory("setDisabled", ["setContext", function(setContext) {
  return function(done, context) {
    var temp_context = setContext(context, "state");
    done ? temp_context.disabled = false : temp_context.disabled = true;
  };
}])
.factory("findListOnStorage", function() {
  return function(id, listKey) {
		for (var key in window.localStorage) {
			if (key.indexOf(listKey) === 0) {
				if (window.localStorage[key].indexOf(id) > -1) {
					return key;
				}
			}
		}
	};
})
.factory("removeListOnStorage", ["findListOnStorage", function(findListOnStorage) {
  return function(id, listKey) {
		var key = findListOnStorage(id, listKey);
		window.localStorage.removeItem(key);
	}
}])
.factory("getNameSpace", function() {
  return function(namespaceStr, scope) {
    var ret = scope;
    var namespaceArr = namespaceStr.split(".");
    for (var i = 0, len = namespaceArr.length; i < len; i++) {
      ret = ret[namespaceArr[i]];
    }
    return ret;
  }
})
.factory("resetViewValue", function() {
  return function(scope, elem, ctrl, errorName, displayElem) {
    scope.$watch(function(scope) {
      return scope["resetViewValue"];
    }, function(newValue, oldValue) {
      if (newValue === true) {
        ctrl.$rollbackViewValue();
        // if the unsaved list has an invalid input
        // reset it to "valid"
        // more precisly, no visual effect of invalidation
        elem.parent().removeClass("has-error");
        errorName && ctrl.$setValidity(errorName, true);
      }
    }, true);
  };
})
.factory("autoCheck", function() {
  return function(elem, ctrl, eventType, validType) {
    elem.on(eventType, function() {
      var valid = ctrl.$validators[validType]();
      if (!valid) {
        elem.parent().addClass("has-error");
      } else {
        elem.parent().removeClass("has-error");
      }
      ctrl.$validate();
    });
  };
})
.factory("selectAll", function() {
  return function(ctrl, lists, prop) {
    if (lists.length === 0) {
      return;
    }
    var list;
    var checked = ctrl.state.all;
    for (var i = 0, len = lists.length; i < len; i++) {
      list = lists[i];
      list[prop] = checked;
    }
  };
})
.factory("checkAll", function() {
  return function(ctrl, lists, prop) {
    var list;
    var checked = true;
    for (var i = 0, len = lists.length; i < len; i++) {
      list = lists[i];
      if (!list[prop]) {
        checked = false;
        break;
      }
    }
    if (checked) {
      ctrl.state.all = true;
    } else {
      ctrl.state.all = false;
    }
  };
})
.factory("removeMultiLists", ["removeListOnStorage", function(removeListOnStorage) {
  return function(ctrl, lists, prop, fn) {
    var i = 0;
    var list;
    while (lists[i] !== undefined) {
      list = lists[i];
      if (list[prop]) {
        lists.splice(i, 1);
        removeListOnStorage(list.id, ctrl.config.listKey);
        if (typeof fn === "function") {
          fn(list);
        }
      } else {
        i++;
      }
    }
  }
}])
.factory("createKey", function() {
  return function(str) {
    return str + (Date.now() + Math.floor(Math.random() * 1000000));
  };
})
.directive("ycRequired", ["resetViewValue", "autoCheck", "gevent",
  function(resetViewValue, autoCheck, gevent) {
  return {
    require: "ngModel",
    link: function(scope, elem, attrs, ctrl) {
      var ngModelOptions = attrs["ycRequired"];
      if (ngModelOptions === "true") {
        autoCheck(elem, ctrl, "keyup", "ycRequired");
      }

      ctrl.$validators.ycRequired = function(modelValue, viewValue) {
        ngModelOptions === "true" && (viewValue = ctrl.$viewValue);
        if (!viewValue) {
          return false;
        }
        return true;
      };
      // rollback the $viewValue
      resetViewValue(scope, elem, ctrl, "ycRequired", "h3");

    }
  };
}])
.directive("year", ["resetViewValue", "autoCheck",
  function(resetViewValue, autoCheck) {
  return {
    require: "ngModel",
    link: function(scope, elem, attrs, ctrl) {
      var ngModelOptions = attrs["year"];
      if (ngModelOptions === "true") {
        autoCheck(elem, ctrl, "keyup mouseup", "year")
      }

      ctrl.$validators.year = function(modelValue, viewValue) {
        ngModelOptions === "true" && (viewValue = ctrl.$viewValue);
        if (viewValue === Math.E) {
          return false;
        }
        if (String(viewValue).indexOf(".") > -1) {
          return false;
        }
        if (viewValue < 0 || viewValue > 9999) {
          return false;
        }
        return true;
      }

      resetViewValue(scope, elem, ctrl, "year", "span.year");
    }
  };
}])
.directive("month", ["resetViewValue", "autoCheck",
  function(resetViewValue, autoCheck) {
  return {
    require: "ngModel",
    link: function(scope, elem, attrs, ctrl) {
      var ngModelOptions = attrs["month"];
      if (ngModelOptions === "true") {
        autoCheck(elem, ctrl, "keyup mouseup", "month");
      }

      ctrl.$validators.month = function(modelValue, viewValue) {
        ngModelOptions === "true" && (viewValue = ctrl.$viewValue);
        if (viewValue === Math.E) {
          return false;
        }
        if (String(viewValue).indexOf(".") > -1) {
          return false;
        }
        if (viewValue > 12 || viewValue < 1) {
          return false;
        }
        return true;
      };

      resetViewValue(scope, elem, ctrl, "month", "span.month");
    }
  };
}])
.directive("day", ["resetViewValue", "autoCheck",
  function(resetViewValue, autoCheck) {
  return {
    require: "ngModel",
    link: function(scope, elem, attrs, ctrl) {
      var ngModelOptions = attrs["day"];
      if (ngModelOptions === "true") {
        autoCheck(elem, ctrl, "keyup mouseup", "day");
      }

      ctrl.$validators.day = function(modelValue, viewValue) {
        ngModelOptions === "true" && (viewValue = ctrl.$viewValue);
        if (viewValue === Math.E) {
          return false;
        }
        if (String(viewValue).indexOf(".") > -1) {
          return false;
        }
        if (viewValue < 1 || viewValue > 31) {
          return false;
        }
        return true;
      }

      resetViewValue(scope, elem, ctrl, "day", "span.day");
    }
  };
}])
.directive("ycDisabled", ["getNameSpace", function(getNameSpace) {
  return {
    link: function(scope, elem, attrs, ctrl) {
      var formStr, watchStr, watch, opp;
      var obj = eval("(" + attrs["ycDisabled"].trim() + ")");
      // get form string
      formStr = obj["form"];
      // get watch string, then use getNameSpace to get the watch value
      watchStr = obj["watch"];
      if (watchStr) {
        watch = getNameSpace(watchStr, scope);
        if (watch === undefined) {
          throw new Error("The watch property of ycDisabled is undefined. Relevant \
            element: " + elem);
        }
      } else {
        // when user doesn't provide a watch property, set watch to false
        watch = false;
      }

      requestAnimationFrame(function() {
        if (!scope[formStr]) {
          return;
        }
        if (scope[formStr].$valid && watch === false) {
          elem.prop("disabled", false);
        } else if (!scope[formStr].$valid || watch === true) {
          elem.prop("disabled", true);
        }
        watchStr && (watch = getNameSpace(watchStr, scope));
        requestAnimationFrame(arguments.callee);
      });

    }
  };
}])
.directive("ycDelayRequired", function() {
  return {
    require: "ngModel",
    link: function(scope, elem, attrs, ctrl) {
      // two things need to be set seperately
      // first: the value of property that controlls the "has-error" class (ngClass)
      // second: the validation of input, aka the same as "reqired" attribute
      // when user start to add a new list
      // the $valid property of the form (form.$valid) needs to be false
      // the controlling-ngClass property needs to be false also
      // however, normally falsy form.$valid value means truthy value of
      // form.input.$error.someDirective
      // therefore seperating the value setting processes is important for this case

      // okToValid means when the validation of input could "start"
      // it's not the real start of validation
      // "start" here means the validation could return true to activate the submit botton
      // only after user start to type the keyboard will the validation process begin
      elem.on("keydown", function() {
        scope["okToValid"] = true;
      });

      ctrl.$validators.ycDelayRequired = function(modelValue, viewValue) {
        if (scope["okToValid"]) {
          if (!viewValue) {
            // ycDelayRequiredError is used to controll ngClass for the input
            scope["ycDelayRequiredError"] = true;
            return false;
          }
          scope["ycDelayRequiredError"] = false;
          return true;
        }
        // if user hasn't typed, always return false
        // which means there is always an error in the whole validation
        // and the submit button will stay disabled
        return false;
      }
    }
  };
})
.directive("descr", ["resetViewValue", function(resetViewValue) {
  return {
    require: "ngModel",
    link: function(scope, elem, attrs, ctrl) {
      resetViewValue(scope, elem, ctrl);
    }
  };
}])
.service("listData", function() {
  var service = {
    lists: [],
    trashLists: [],
  };
  return service;
})
