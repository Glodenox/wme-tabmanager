// ==UserScript==
// @name        WME Tab Preferences
// @namespace   http://www.tomputtemans.com/
// @description Preserve the order of your tabs, optimize the positioning of your tabs and other tab-related improvements
// @include     https://www.waze.com/*/editor/*
// @include     https://www.waze.com/editor/*
// @include     https://editor-beta.waze.com/*
// @icon        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAA3CAYAAACo29JGAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wwCEzYBoD6dGgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACfUlEQVRo3u3aTUgUYRjA8b/bjKyziyyTH2VpKYoHDxLkaTFvRSJCeBHxpFBHCULoWgcpqL3VqZaQIIKULlKSBoqIGJjQQTE2T8YqbpCzrwuz63Zwxy5+pLTtzvY8txle5n1+PO/XDFP0c8tKU6DhoYBDcIITnOAE99/jtKMa2LaNUnGSts3Ozk5+VMTjQdN1jBIDvbj4wHZFh51QtpXCsrbyujo+nx/D5zte5Wzb3oOZponf70fTtLwAJZNJLMsiFosRj1vour5vBQ+cc0rF92CBQCBvYACaphEIBDBNczfXbXW8BSWVSgFgGEbeDkknNyfXP8clkwAUHzJhcx1Obk6uss8JTnCCy93x6+/FJgvvp1hVBhevXOPS6UKo3NoUI++WSDDHyMMQodBTJpbAmn/D6EIiq10feLbcWI8CUFdXd/KnJxZ4cusOr76BYZxCqQzGa2CkFIpaeh+/4GbzybuIRCIAlFdU/uPKeSs5X1UC2L9hAAmFsoGzLbQ0unJYWnz5MMemx7t7WRrk9vA4U2PPGQiWZpDf+Twxw1fLdbhJXt4LEZ5eB6CmvZsbF7zgr6eru50agPVpwg/u8mzSdbgKquvLMA19d63ciOIMzLXIKpsAuoFZdo7yUjcuKMBKuJ/+8AqgYzZeptmMsfhpmZgNtAww9qgLP25cUJhh9O2K8/pLbHmWj7MZGMD8ME9mXLvPBenta+NM7XUGh3poyNxt6Bli8Go15W199AZdfEKp6rzP606ARaJN4/yIVtHaGqSjKUhHlvvO+pzLduRwzslbgeAEJzjBCS6331CczdrtsZ+joCtXlE6n5Q8iwQlOcIITnOAEJzjBCe6I+AVAjNynsKm5WAAAAABJRU5ErkJggg==
// @version     0.2
// @grant       none
// ==/UserScript==

(function() {
  var tabReopened = false, // have we reopened the tab from last time?
      timesRan = 0, // variable for sanity check
      tabsSecured = -1, // Up until which index have we rearranged the tabs?
      versions = ['0.1', '0.2'],
      Storage = (function() {
        var hashes = (localStorage.tabprefs_hidden ? localStorage.tabprefs_hidden.split(',') : []);
        log(hashes.join());
        return {
          setTabVisibility: function(hash, visible) {
            var hashIndex = hashes.indexOf(hash);
            if (hashIndex !== -1 && visible) {
              hashes.splice(hashIndex, 1);
              localStorage.tabprefs_hidden = hashes.join();
            } else if (hashIndex === -1 && !visible) {
              hashes.push(hash);
              localStorage.tabprefs_hidden = hashes.join();
            }
          },
          isTabVisible: function(hash) {
            return hashes.indexOf(hash) === -1;
          }
        };
      })();

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
          remove_tab: 'Tab no longer found. Remove entry?',
          hide_permissions: 'Hide editing permissions paragraph'
        },
        update: {
          first_run: 'Thanks for using Tab Preferences!\nThe settings tab on the left contains additional options now.\nThis message will only appear one time.',
          v0_1: 'Initial version with tab memory and order preservation',
          v0_2: 'Improvements to order preservation algorithm and addition of these messages'
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
    
    checkVersion();
    
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
      if (!Storage.isTabVisible(tabs.children[i].querySelector('a').hash)) {
        tabs.children[i].style.display = 'none';
      }
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
            if (!Storage.isTabVisible(mutationRecord.addedNodes[i].querySelector('a').hash)) {
              mutationRecord.addedNodes[i].style.display = 'none';
            }
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
    var prefsTab = document.querySelector('#sidepanel-prefs'),
        permissions = document.querySelector('.permissions');
    if (!prefsTab) {
      log('No settings tab found yet, snoozing');
      setTimeout(initSettings, 400);
      return;
    }
    var section = prefsTab.querySelector('.side-panel-section'),
        heading = document.createElement('h4'),
        tabOrderPanel = document.createElement('ul'),
        formGroup = document.createElement('div');
    heading.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.title')));
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
    tabOrderPanel.className = 'result-list';
    tabOrderPanel.id = 'tabPreferencesOrder';
    tabOrderPanel.style.marginLeft = '30px';
    tabOrderPanel.style.border = '1px solid black';
    tabOrderPanel.style.display = (localStorage.tabprefs_preserveOrder ? 'block' : 'none');
    formGroup.appendChild(tabOrderPanel);
    
    section.querySelector('.form-group').appendChild(createOption('hidePermissions', I18n.t('tabpreferences.prefs.hide_permissions'), localStorage.tabprefs_hidePermissions, function() {
      if (this.checked) {
        permissions.style.display = 'none';
        localStorage.tabprefs_hidePermissions = true;
      } else {
        permissions.style.display = 'block';
        localStorage.removeItem('tabprefs_hidePermissions');
      }
    }));
    if (localStorage.tabprefs_hidePermissions) {
      permissions.style.display = 'none';
    }
    
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
  function reorderTabs(force) {
    if (force) {
      tabsSecured = -1;
    }
    // Protection against possible infinite loop if certain scripts don't follow the standards
    if (timesRan > 1000) {
      return;
    }
    if (timesRan === 1000) {
      log('Sanity limit reached! Tab Preferences is most likely fighting with another script. Backing off now.');
      // run one last time to increase counter
    }
    timesRan++;
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
      for (var i = tabsSecured+1; i < hashes.length; i++) {
        var tabAnchor = navTabs.querySelector('a[href$="'+hashes[i]+'"]');
        if (!tabAnchor) {
          tabsMissing++;
          continue;
        }
        var tabIndex = Array.prototype.indexOf.call(navTabs.children, tabAnchor.parentNode);
        if (tabIndex === i && tabsSecured === tabIndex-1) {
          tabsSecured++;
        }
        if (tabAnchor && tabIndex !== i - tabsMissing && i < navTabs.children.length) {
          navTabs.insertBefore(tabAnchor.parentNode, navTabs.children[i - tabsMissing]);
          if (tabsSecured === i-1) {
            tabsSecured++;
          }
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
          hide = document.createElement('span'),
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
      hide.className = (Storage.isTabVisible(hash) ? 'icon-eye-close' : 'icon-eye-open');
      hide.style.cursor = 'pointer';
      hide.style.marginLeft = '3px';
      hide.title = I18n.t('tabpreferences.hide_tab');
      hide.addEventListener('click', function() {
        if (this.className === 'icon-eye-close') {
          this.className = 'icon-eye-open';
          anchor.parentNode.style.display = 'none';
          Storage.setTabVisibility(hash, false);
        } else {
          this.className = 'icon-eye-close';
          anchor.parentNode.style.display = 'block';
          Storage.setTabVisibility(hash, true);
        }
      });
      buttons.appendChild(hide);
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
          reorderTabs(true);
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
          reorderTabs(true);
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
  
  function checkVersion() {
    var version = localStorage.tabprefs_version,
        scriptVersion = GM_info.script.version;
    if (!version) {
      showMessage(I18n.t('tabpreferences.update.first_run'));
      localStorage.tabprefs_version = scriptVersion;
    } else if (version !== scriptVersion) {
      if (versions.indexOf(version) === -1) {
        // Weird stuff happening, just reset
        localStorage.tabprefs_version = scriptVersion;
        return;
      }
      var message = 'New version installed! Changelog:';
      for (var i = versions.indexOf(version)+1; i < versions.length; i++) {
        message += '\nv' + versions[i] + ': ' + I18n.t('tabpreferences.update.v' + versions[i].replace(/\./g, '_'));
      }
      showMessage(message);
      localStorage.tabprefs_version = scriptVersion;
    }
  }
  
  function showMessage(message) {
    alert('Tab Preferences\n=============\n' + message);
  }
  
  function log(message) {
    if (console.log) {
      console.log('%cWME Tab Preferences: %c' + message, 'color:black', 'color:#d97e00');
    }
  }
  
  log('version - ' + GM_info.script.version);
  init();
})();
