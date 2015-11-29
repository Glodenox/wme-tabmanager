// ==UserScript==
// @name        WME Tab Preferences
// @namespace   http://www.tomputtemans.com/
// @description Preserve the order of your tabs, optimize the positioning of your tabs and other tab-related improvements
// @include     https://www.waze.com/*/editor/*
// @include     https://www.waze.com/editor/*
// @include     https://editor-beta.waze.com/*
// @version     0.1
// @grant       none
// ==/UserScript==

(function() {
  var tabReopened = false,
      stack = 0;

  function init() {
		if (typeof I18n === 'undefined') {
      log('No internationalisation object found yet, snoozing');
      setTimeout(init, 300);
      return;
    }
    
    var om_strings = {
			en: {
        prefs: {
          title: 'Tab Preferences',
          preserve_tab: 'Preserve opened tab over sessions',
          preserve_order: 'Preserve tab order over sessions',
          remove_tab: 'Tab no longer found. Remove entry?'
        }
			},
			nl: {
        prefs: {
          title: 'Tabvoorkeuren',
          preserve_tab: 'Geopende tab bijhouden tussen sessies',
          preserve_order: 'Volgorde van tabs bijhouden tussen sessies',
          remove_tab: 'Tab niet langer gevonden. Verwijderen?'
        }
			}
		};
		om_strings['en_GB'] = om_strings.en;
		for(var i = 0; i < I18n.availableLocales.length; i++) {
			var locale = I18n.availableLocales[i];
			if (I18n.translations[locale]) {
				I18n.translations[locale].tabpreferences = om_strings[locale];
			}
		}
    
    // Always add scrollbar to sidepanel to keep the width constant
    document.getElementById('sidebar').style.overflowY = 'scroll';
    
    initTabListener();
    initSettings();
  }
  
  function initTabListener() {
    var tabs = document.querySelector('#user-tabs .nav-tabs');
    if (!tabs) {
      log('No tabs found yet, snoozing');
      setTimeout(initTabListener, 400);
      return;
    }
    log('Tabs found, enabling observers');
    var selectionObserver = new MutationObserver(function(mutationRecords) {
      mutationRecords.forEach(function(mutationRecord) {
        // Store last opened tab when one of the tabs receives focus
        if (localStorage.tabprefs_reopenTab && mutationRecord.target.className === 'active') {
          log('New tab to reopen set');
          localStorage.tabprefs_reopenTab = mutationRecord.target.querySelector('a').hash;
        }
      });
    });
    for (var i = 0; i < tabs.children.length; i++) {
      selectionObserver.observe(tabs.children[i], { attributes: true, attributeFilter: ['class'] });
    }
    
    var tabObserver = new MutationObserver(function(mutationRecords) {
      if (!tabReopened) {
        reopenTab();
      }
      mutationRecords.forEach(function(mutationRecord) {
        // Reorder tabs when new ones get added
        if (mutationRecord.addedNodes.length > 0) {
          for (var i = 0; i < mutationRecord.addedNodes.length; i++) {
            selectionObserver.observe(mutationRecord.addedNodes[i], { attributes: true, attributeFilter: ['class'] });
          }
          reorderTabs();
        }
      });
    });
    tabObserver.observe(tabs, { childList: true });
    reopenTab();
    reorderTabs();
  }

  function initSettings() {
    var prefsTab = document.querySelector('#sidepanel-prefs');
    if (!prefsTab) {
      log('No settings tab found yet, snoozing');
      setTimeout(initSettings, 400);
      return;
    }
    var heading = document.createElement('h4');
    heading.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.title')));
    var formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.appendChild(createOption('reopenTab', I18n.t('tabpreferences.prefs.preserve_tab'), (localStorage.tabprefs_reopenTab ? true : false), function() {
      if (this.checked) {
        localStorage.tabprefs_reopenTab = document.querySelector('#user-tabs .nav-tabs li.active a').hash;
      } else {
        localStorage.removeItem('tabprefs_reopenTab');
      }
    }));
    formGroup.appendChild(createOption('preserveOrder', I18n.t('tabpreferences.prefs.preserve_order'), (localStorage.tabprefs_preserveOrder ? true : false), function() {
      if (this.checked) {
        saveTabOrder();
        document.getElementById('tabPreferencesOrder').style.display = 'block';
      } else {
        localStorage.removeItem('tabprefs_preserveOrder');
        document.getElementById('tabPreferencesOrder').style.display = 'none';
      }
    }));
    var tabOrderPanel = document.createElement('ul');
    tabOrderPanel.className = 'result-list';
    tabOrderPanel.id = 'tabPreferencesOrder';
    tabOrderPanel.style.marginLeft = '30px';
    tabOrderPanel.style.border = '1px solid '
    tabOrderPanel.style.display = (localStorage.tabprefs_preserveOrder ? 'block' : 'none');
    formGroup.appendChild(tabOrderPanel);
    
    var section = prefsTab.querySelector('.side-panel-section');
    section.appendChild(heading);
    section.appendChild(formGroup);

    refreshTabPanel();
  }
  
  // Add options to the preferences tab
  function createOption(name, description, checked, eventHandler) {
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.id = name + '-on';
    input.checked = checked;
    input.addEventListener('click', eventHandler);
    var label = document.createElement('label');
    label.htmlFor = name + '-on';
    label.appendChild(document.createTextNode(description));
    var container = document.createElement('div');
    container.className = 'controls-container';
    container.appendChild(input);
    container.appendChild(label);
    return container;
  }
  
  // Attempt to reopen the tab opened during the previous session
  function reopenTab() {
    if (!localStorage.tabprefs_reopenTab) {
      return;
    }
    var tab = document.querySelector('#user-tabs .nav-tabs li a[href$="'+localStorage.tabprefs_reopenTab+'"]');
    if (!tabReopened && tab) {
      log("Tab to reopen found, reopening now");
      var clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      });
      tab.dispatchEvent(clickEvent);
      tabReopened = true;
    }
  }
  
  // Save tab order to local storage
  function saveTabOrder() {
    var tabs = document.querySelectorAll('#user-tabs .nav-tabs li a'),
        hashes = [];
    for (var i = 0; i < tabs.length; i++) {
      hashes.push(tabs[i].hash);
    }
    localStorage.tabprefs_preserveOrder = hashes.join();
    refreshTabPanel();
  }
  
  // If necessary, start reordering the tags as they were saved
  function reorderTabs() {
    // Protection against possible infinite loop if certain scripts don't follow the standards
    if (stack > 1000) {
      log('Security limit reached!');
      return;
    }
    stack++;
    if (localStorage.tabprefs_preserveOrder) {
      var hashes = localStorage.tabprefs_preserveOrder.split(','),
          navTabs = document.querySelector('#user-tabs ul.nav-tabs'),
          navAnchors = navTabs.querySelectorAll('li a');
      // First we check whether we know all tabs we currently have
      for (var i = 0; i < navAnchors.length; i++) {
        if (hashes.indexOf(navAnchors[i].hash) === -1) {
          // Add unknown tags to the end of the list
          hashes.push(navAnchors[i].hash);
        }
      }
      localStorage.tabprefs_preserveOrder = hashes.join();
      refreshTabPanel();
      // Then we put them in the order we have stored
      var tabsMissing = 0;
      for (var i = 0; i < hashes.length; i++) {
        var tabAnchor = navTabs.querySelector('a[href$="'+hashes[i]+'"]');
        if (!tabAnchor) {
          tabsMissing++;
          continue;
        }
        if (tabAnchor && Array.prototype.indexOf.call(navTabs.children, tabAnchor.parentNode) !== hashes.indexOf(tabAnchor.hash) - tabsMissing && i < navTabs.children.length) {
          navTabs.insertBefore(tabAnchor.parentNode, navTabs.children[i - tabsMissing]);
        }
      }
    }
  }
  
  function refreshTabPanel() {
    var tabPanel = document.getElementById('tabPreferencesOrder');
    if (!localStorage.tabprefs_preserveOrder || !tabPanel) {
      return;
    }
    var order = localStorage.tabprefs_preserveOrder.split(',');
    while (tabPanel.firstChild) {
      tabPanel.removeChild(tabPanel.firstChild);
    }
    order.forEach(function(hash, index, obj) {
      var item = document.createElement('li'),
          name = document.createElement('span'),
          buttons = document.createElement('div'),
          moveUp = document.createElement('span'),
          moveDown = document.createElement('span'),
          remove = document.createElement('span'),
          anchor = document.querySelector('#user-tabs .nav-tabs li a[href$="'+hash+'"]');
      if (anchor) {
        var title = anchor.title;
        if (!title) {
          title = anchor.parentNode.title;
        }
        name.innerHTML = anchor.innerHTML + (title ? ' ('+title+')' : '');
      } else {
        name.style.color = '#888';
        name.style.fontStyle = 'italic';
        name.appendChild(document.createTextNode(hash));
      }
      item.appendChild(name);

      if (!anchor) {
        remove.className = 'icon-remove';
        remove.style.cursor = 'pointer';
        remove.title = I18n.t('tabpreferences.remove_tab');
        remove.addEventListener('click', function() {
          obj.splice(index, 1);
          localStorage.tabprefs_preserveOrder = obj.join();
          refreshTabPanel();
        });
        buttons.appendChild(remove);
      }
      moveDown.className = 'icon-chevron-down';
      moveDown.style.cursor = 'pointer';
      moveDown.style.marginLeft = '3px';
      if (index === order.length - 1) {
        moveDown.style.color = '#aaa';
      } else {
        moveDown.addEventListener('click', function() {
          // adjust localStorage, then reorder and refresh
          obj.splice(index+1, 0, obj.splice(index, 1)[0]);
          localStorage.tabprefs_preserveOrder = obj.join();
          reorderTabs();
          refreshTabPanel();
        });
      }
      buttons.appendChild(moveDown);
      moveUp.className = 'icon-chevron-up';
      moveUp.style.cursor = 'pointer';
      moveUp.style.marginLeft = '3px';
      if (index === 0) {
        moveUp.style.color = '#aaa';
      } else {
        moveUp.addEventListener('click', function() {
          // adjust localStorage, then reorder and refresh
          obj.splice(index-1, 0, obj.splice(index, 1)[0]);
          localStorage.tabprefs_preserveOrder = obj.join();
          reorderTabs();
          refreshTabPanel();
        });
      }
      buttons.appendChild(moveUp);
      
      buttons.style.float = 'right';
      item.className = 'result';
      item.appendChild(buttons);
      tabPanel.appendChild(item);
    });
  }
  
  function log(message) {
    if (console.log) {
      console.log('%cWME Tab Preferences: %c' + message, 'color:black', 'color:#d97e00');
    }
  }
  
  log('version - ' + GM_info.script.version);
  init();
})();
