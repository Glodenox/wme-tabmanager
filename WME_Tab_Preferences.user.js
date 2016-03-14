// ==UserScript==
// @name        WME Tab Preferences
// @namespace   http://www.tomputtemans.com/
// @description Adjust the tabs in the Waze Map Editor to your liking by adjusting their size, hiding tabs or even renaming tabs completely.
// @include     https://www.waze.com/*/editor/*
// @include     https://www.waze.com/editor/*
// @include     https://editor-beta.waze.com/*
// @exclude     https://www.waze.com/user/*editor/*
// @icon        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAA3CAYAAACo29JGAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wwCEzYBoD6dGgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACfUlEQVRo3u3aTUgUYRjA8b/bjKyziyyTH2VpKYoHDxLkaTFvRSJCeBHxpFBHCULoWgcpqL3VqZaQIIKULlKSBoqIGJjQQTE2T8YqbpCzrwuz63Zwxy5+pLTtzvY8txle5n1+PO/XDFP0c8tKU6DhoYBDcIITnOAE99/jtKMa2LaNUnGSts3Ozk5+VMTjQdN1jBIDvbj4wHZFh51QtpXCsrbyujo+nx/D5zte5Wzb3oOZponf70fTtLwAJZNJLMsiFosRj1vour5vBQ+cc0rF92CBQCBvYACaphEIBDBNczfXbXW8BSWVSgFgGEbeDkknNyfXP8clkwAUHzJhcx1Obk6uss8JTnCCy93x6+/FJgvvp1hVBhevXOPS6UKo3NoUI++WSDDHyMMQodBTJpbAmn/D6EIiq10feLbcWI8CUFdXd/KnJxZ4cusOr76BYZxCqQzGa2CkFIpaeh+/4GbzybuIRCIAlFdU/uPKeSs5X1UC2L9hAAmFsoGzLbQ0unJYWnz5MMemx7t7WRrk9vA4U2PPGQiWZpDf+Twxw1fLdbhJXt4LEZ5eB6CmvZsbF7zgr6eru50agPVpwg/u8mzSdbgKquvLMA19d63ciOIMzLXIKpsAuoFZdo7yUjcuKMBKuJ/+8AqgYzZeptmMsfhpmZgNtAww9qgLP25cUJhh9O2K8/pLbHmWj7MZGMD8ME9mXLvPBenta+NM7XUGh3poyNxt6Bli8Go15W199AZdfEKp6rzP606ARaJN4/yIVtHaGqSjKUhHlvvO+pzLduRwzslbgeAEJzjBCS6331CczdrtsZ+joCtXlE6n5Q8iwQlOcIITnOAEJzjBCe6I+AVAjNynsKm5WAAAAABJRU5ErkJggg==
// @version     1.1
// @grant       none
// ==/UserScript==
(function() {
  var tabReopened = false, // have we reopened the tab from last time?
      timesRan = 0, // variable for sanity check
      tabsSecured = -1, // Up until which index have we fully rearranged the tabs?
      versions = ['0.1', '0.2', '1.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.1'],
      Storage = (function() {
        var hashes = (localStorage.tabprefs_hidden ? localStorage.tabprefs_hidden.split(',') : []),
            tabConfigs = (localStorage.tabprefs_configs ? JSON.parse(localStorage.tabprefs_configs) : {});
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
          },
          setTabConfig: function(hash, config) {
            tabConfigs[hash] = config;
            localStorage.tabprefs_configs = JSON.stringify(tabConfigs);
          },
          removeTabConfig: function(hash) {
            delete tabConfigs[hash];
            localStorage.tabprefs_configs = JSON.stringify(tabConfigs);
          },
          getTabConfig: function(hash) {
            return tabConfigs[hash] || {};
          },
          exportConfig: function() {
            return JSON.stringify({
              reopenTab: localStorage.tabprefs_reopenTab,
              tabprefs_tabwidth: localStorage.tabprefs_tabwidth,
              tabprefs_tabheight: localStorage.tabprefs_tabheight,
              tabprefs_preserveOrder: localStorage.tabprefs_preserveOrder,
              tabprefs_hidden: localStorage.tabprefs_hidden,
              tabprefs_configs: localStorage.tabprefs_configs
            });
          },
          importConfig: function(toImport) {
            var config = JSON.parse(toImport);
            var iterator = config.entries();
            for (var entry of iterator) {
              if (entry[0].startsWith('tabprefs_')) {
                localStorage[entry[0]] = entry[1];
              }
            }
          }
        };
      })();

  function init(e) {
    if (e && e.user == null) {
      return;
    }
    if (typeof I18n === 'undefined') {
      log('No internationalisation object found yet, snoozing');
      setTimeout(init, 300);
      return;
    }
    if (typeof Waze === 'undefined' ||
        typeof Waze.loginManager === 'undefined') {
      setTimeout(init, 100);
      return;
    }
    if (!Waze.loginManager.hasUser()) {
      Waze.loginManager.events.register("login", null, init);
      Waze.loginManager.events.register("loginStatus", null, init);
      return;
    }

    var om_strings = {
      en: {
        prefs: {
          title: 'Tab Preferences',
          tab_width: 'Tab width',
          tab_height: 'Tab height',
          reset: 'reset',
          preserve_tab: 'Preserve opened tab over sessions',
          preserve_order: 'Preserve tab order and change names',
          remove_tab: 'Tab no longer available. Remove entry?',
          hide_tab: 'Change tab visibility',
          move_up_tab: 'Move up',
          move_down_tab: 'Move down',
          edit_tab: 'Edit tab',
          change_icon: 'Change icon',
          set_icon: 'Set icon',
          reset_tab: 'Reset tab',
          icon: 'Icon',
          icon_none: 'None set',
          close: 'Close'
        },
        update: {
          first_run: 'Thanks for using Tab Preferences!\nThe settings tab on the left contains additional options now.\nThis message will only appear one time.',
          message: 'New version installed! Changelog:',
          v0_1: '- Initial version with tab memory and order preservation',
          v0_2: '- Improvements to order preservation algorithm\n- Addition of version change messages',
          v1_0: '- Ability to hide a tab added\n- Ability to replace tab with symbol added\n- Ability to resize tabs added\n- Metadata icon added to userscript',
          v1_0_1: '- Fixed the script for Google Chrome',
          v1_0_2: '- Fixed tab size reset buttons in Google Chrome',
          v1_0_3: '- Tab styling is applied with higher specificity, but plays nicer with other scripts as well',
          v1_0_4: '- Tab alignment issues with renamed tabs in Google Chrome fixed',
          v1_0_5: '- Removed strict mode that was necessary for Google Chrome\n- Improved initalisation of script',
          v1_1: '- The list with tab names can now be dragged around\n- Quick tooltips for tabs with replaced names\n- Bug fix concerning the order of the last tabs with some missing tabs'
        }
      },
      nl: {
        prefs: {
          title: 'Tabvoorkeuren',
          tab_width: 'Tabbreedte',
          tab_height: 'Tabhoogte',
          reset: 'reset',
          preserve_tab: 'Geopende tab bijhouden tussen sessies',
          preserve_order: 'Volgorde van tabs bijhouden en namen veranderen',
          remove_tab: 'Tab niet langer beschikbaar. Verwijderen?',
          hide_tab: 'Tabzichtbaarheid veranderen',
          move_up_tab: 'Eerder zetten',
          move_down_tab: 'Verder zetten',
          edit_tab: 'Tab aanpassen',
          change_icon: 'Icoon veranderen',
          set_icon: 'Icoon instellen',
          reset_tab: 'Tab resetten',
          icon: 'Icoon',
          icon_none: 'Niet ingesteld',
          close: 'Sluiten'
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
          localStorage.tabprefs_reopenTab = mutationRecord.target.querySelector('a').hash;
        }
      });
    });
    for (var i = 0; i < tabs.children.length; i++) {
      selectionObserver.observe(tabs.children[i], { attributes: true, attributeFilter: ['class'] });
      if (tabs.children[i].title) {
        $(tabs.children[i]).tooltip();
      }
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
            var node = mutationRecord.addedNodes[i],
                anchor = node.querySelector('a'),
                hash = anchor.hash;
            // Also start observing here for changes to tab selection
            selectionObserver.observe(node, { attributes: true, attributeFilter: ['class'] });
            if (anchor.title) {
              $(anchor).tooltip();
            }
            // Tab visibility
            if (!Storage.isTabVisible(hash)) {
              node.style.display = 'none';
            }
          }
          renameTabs();
          reorderTabs();
          if (localStorage.tabprefs_tabwidth || localStorage.tabprefs_tabheight) {
            resizeTabs();
          }
        }
      });
    });
    tabObserver.observe(tabs, { childList: true });
    reopenTab();
    renameTabs();
    reorderTabs();
    if (localStorage.tabprefs_tabwidth || localStorage.tabprefs_tabheight) {
      resizeTabs();
    }
  }

  function initSettings() {
    var prefsTab = document.querySelector('#sidepanel-prefs');
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
    formGroup.style.marginBottom = '15px';
    formGroup.appendChild(createSlider('tabWidth', I18n.t('tabpreferences.prefs.tab_width'), 'tabprefs_tabwidth', 15, resizeTabs));
    formGroup.appendChild(createSlider('tabHeight', I18n.t('tabpreferences.prefs.tab_height'), 'tabprefs_tabheight', 5, resizeTabs));
    formGroup.appendChild(createOption('reopenTab', I18n.t('tabpreferences.prefs.preserve_tab'), (localStorage.tabprefs_reopenTab ? true : false), function() {
      if (this.checked) {
        localStorage.tabprefs_reopenTab = document.querySelector('#user-tabs .nav-tabs li.active a').hash;
      } else {
        localStorage.removeItem('tabprefs_reopenTab');
      }
    }));
    formGroup.appendChild(createOption('preserveOrder', I18n.t('tabpreferences.prefs.preserve_order'), (localStorage.tabprefs_preserveOrder ? true : false), function() {
      if (this.checked) {
        var tabs = document.querySelectorAll('#user-tabs .nav-tabs li a'),
            hashes = [];
        for (var i = 0; i < tabs.length; i++) {
          hashes.push(tabs[i].hash);
        }
        localStorage.tabprefs_preserveOrder = hashes.join();
        refreshTabPanel();
        document.getElementById('tabPreferencesOrder').style.display = 'block';
      } else {
        localStorage.removeItem('tabprefs_preserveOrder');
        document.getElementById('tabPreferencesOrder').style.display = 'none';
      }
    }));
    tabOrderPanel.className = 'result-list';
    tabOrderPanel.id = 'tabPreferencesOrder';
    tabOrderPanel.style.display = (localStorage.tabprefs_preserveOrder ? '' : 'none');
    formGroup.appendChild(tabOrderPanel);
    $(tabOrderPanel).sortable({
      forcePlaceholderSize: true,
      placeholderClass: 'result'
    }).bind('sortupdate', function(e, ui) {
      var order = localStorage.tabprefs_preserveOrder.split(',');
      order.splice(ui.elementIndex, 0, order.splice(ui.oldElementIndex, 1)[0]);
      localStorage.tabprefs_preserveOrder = order.join();
      reorderTabs(true);
      refreshTabPanel();
    });

    // Obsolete option, remove from localStorage
    if (localStorage.tabprefs_hidePermissions) {
      localStorage.removeItem('tabprefs_hidePermissions');
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

  // Add sliders to the preferences tab
  function createSlider(name, description, storageKey, defaultValue, eventHandler) {
    var input = document.createElement('input');
    input.type = 'range';
    input.name = name;
    input.id = name + '-on';
    input.min = 0;
    input.max = 30;
    input.value = (localStorage[storageKey] ? localStorage[storageKey] : defaultValue);
    input.addEventListener('input', function() {
      localStorage[storageKey] = this.value;
      eventHandler();
    });
    input.style.verticalAlign = 'middle';
    var label = document.createElement('label');
    label.htmlFor = name + '-on';
    label.appendChild(document.createTextNode(description));
    label.style.marginRight = '4px';
    var reset = document.createElement('button');
    reset.className = 'btn-link';
    reset.style.paddingRight = '0';
    reset.addEventListener('click', function() {
      input.value = defaultValue;
      localStorage.removeItem(storageKey);
      eventHandler();
    });
    reset.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.reset')));
    var container = document.createElement('div');
    container.className = 'controls-container';
    container.appendChild(label);
    container.appendChild(input);
    container.appendChild(reset);
    return container;
  }

  // Attempt to reopen the tab opened during the previous session
  function reopenTab() {
    if (!localStorage.tabprefs_reopenTab) {
      return;
    }
    var tab = document.querySelector('#user-tabs .nav-tabs li a[href$="'+localStorage.tabprefs_reopenTab+'"]');
    if (!tabReopened && tab) {
      var clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      tab.dispatchEvent(clickEvent);
      tabReopened = true;
    }
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
      log('Sanity limit reached! Tab Preferences is most likely conflicting with another script. Backing off from now on.');
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
        if (tabAnchor && tabIndex !== i - tabsMissing && i - tabsMissing < navTabs.children.length) {
          navTabs.insertBefore(tabAnchor.parentNode, navTabs.children[i - tabsMissing]);
          if (tabsSecured === i-1) {
            tabsSecured++;
          }
        }
      }
    }
  }

  function resizeTabs() {
    var width = (localStorage.tabprefs_tabwidth ? localStorage.tabprefs_tabwidth : 15),
        height = (localStorage.tabprefs_tabheight ? localStorage.tabprefs_tabheight : 5),
        tabAnchors = document.querySelectorAll('#user-tabs .nav-tabs li a');
    for (var i = 0; i < tabAnchors.length; i++) {
      tabAnchors[i].style.cssText += ';padding:' + height + 'px ' + width + 'px !important';
    }
  }

  function renameTabs(force) {
    var tabs = document.querySelectorAll('#user-tabs .nav-tabs li a');
    for (var i = 0; i < tabs.length; i++) {
      var anchor = tabs[i],
          config = Storage.getTabConfig(anchor.hash);
      if (config && config.icon && (!anchor.originalChildren || force)) {
        if (!anchor.originalChildren) {
          var children = [];
          for (var j = 0; j < anchor.childNodes.length; j++) { // Bleh, nodelist doesn't support for each
            children.push(anchor.childNodes[j]);
          }
          anchor.originalTitle = anchor.title || anchor.dataset.originalTitle || anchor.parentNode.title || anchor.parentNode.dataset.originalTitle;
          if (!anchor.title) {
            anchor.title = anchor.textContent.trim();
          }
          $(anchor).tooltip();
          anchor.originalChildren = children;
        }
        if (config.icon) {
          var span = document.createElement('span');
          switch (config.icon.fontFamily) {
            case 'FontAwesome':
              span.className = 'fa';
              break;
            default:
              log('Unsupported fontFamily found: ' + config.icon.fontFamily);
          }
          span.appendChild(document.createTextNode(String.fromCharCode(config.icon.charCode)));
          while (anchor.firstChild) {
            anchor.removeChild(anchor.firstChild);
          }
          anchor.appendChild(span);
        }
      }
      // Icon replacement has been removed
      if (!config.icon && anchor.originalChildren) {
        while (anchor.firstChild) {
          anchor.removeChild(anchor.firstChild);
        }
        anchor.originalChildren.forEach(function(node) {
          anchor.appendChild(node);
        });
        delete anchor.originalChildren;
        if (anchor.originalTitle) {
          anchor.title = anchor.originalTitle;
          $(anchor).tooltip();
        } else {
          anchor.removeAttribute('title');
          $(anchor).tooltip('destroy');
          delete anchor.dataset.originalTitle;
        }
        delete anchor.originalTitle;
      }
    }
  }

  function refreshTabPanel() {
    var tabPanel = document.getElementById('tabPreferencesOrder'),
        eyeSlashIcon = String.fromCharCode(61552),
        eyeIcon = String.fromCharCode(61550);
    if (!localStorage.tabprefs_preserveOrder || !tabPanel) {
      return;
    }
    var order = localStorage.tabprefs_preserveOrder.split(',');
    while (tabPanel.firstChild) { // clear out tabPanel's children
      tabPanel.removeChild(tabPanel.firstChild);
    }
    order.forEach(function(hash, index, obj) {
      var item = document.createElement('li'),
          name = document.createElement('span'),
          buttons = document.createElement('div'),
          moveUp = createIconButton('?', I18n.t('tabpreferences.prefs.move_up_tab')),
          moveDown = createIconButton('?', I18n.t('tabpreferences.prefs.move_down_tab')),
          remove = createIconButton('?', I18n.t('tabpreferences.prefs.remove_tab')),
          hide = createIconButton((Storage.isTabVisible(hash) ? eyeIcon : eyeSlashIcon), I18n.t('tabpreferences.prefs.hide_tab')),
          edit = createIconButton('?', I18n.t('tabpreferences.prefs.edit_tab')),
          anchor = document.querySelector('#user-tabs .nav-tabs li a[href$="'+hash+'"]'),
          tabConfig = {};
      if (anchor) {
        tabConfig = Storage.getTabConfig(hash);
      }
      // Add action buttons
      if (!anchor) {
        remove.addEventListener('click', function() {
          obj.splice(index, 1);
          localStorage.tabprefs_preserveOrder = obj.join();
          refreshTabPanel();
        });
        buttons.appendChild(remove);
      } else {
        if (hash !== '#sidepanel-prefs') { // Prevent the preferences tab from being hidden and getting locked out
          hide.addEventListener('click', function() {
            if (Storage.isTabVisible(hash)) {
              this.innerHTML = eyeSlashIcon;
              anchor.parentNode.style.display = 'none';
              Storage.setTabVisibility(hash, false);
            } else {
              this.innerHTML = eyeIcon;
              anchor.parentNode.style.display = 'block';
              Storage.setTabVisibility(hash, true);
            }
            refreshTabPanel();
          });
          hide.addEventListener('mouseenter', function() {
            this.innerHTML = (Storage.isTabVisible(hash) ? eyeSlashIcon : eyeIcon);
          });
          hide.addEventListener('mouseleave', function() {
            this.innerHTML = (Storage.isTabVisible(hash) ? eyeIcon : eyeSlashIcon);
          });
          buttons.appendChild(hide);
        }
        edit.addEventListener('click', function() {
          if (!item.details) {
            createTabConfigPane(item, hash);
          } else {
            item.removeChild(item.details);
            item.details = false;
          }
        });
        buttons.appendChild(edit);
      }
      if (index === order.length - 1) {
        moveDown.style.cursor = 'default';
        moveDown.style.color = '#aaa';
      } else {
        moveDown.addEventListener('click', function() {
          obj.splice(index+1, 0, obj.splice(index, 1)[0]);
          localStorage.tabprefs_preserveOrder = obj.join();
          reorderTabs(true);
          refreshTabPanel();
        });
      }
      buttons.appendChild(moveDown);
      if (index === 0) {
        moveUp.style.color = '#aaa';
        moveUp.style.cursor = 'default';
      } else {
        moveUp.addEventListener('click', function() {
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
      var handle = document.createElement('span');
      handle.style.fontFamily = 'FontAwesome';
      handle.style.letterSpacing = '1px';
      handle.style.color = '#c2c2c2';
      handle.style.cursor = 'move';
      handle.style.fontSize = '11px';
      handle.appendChild(document.createTextNode('?? '));
      item.appendChild(handle);
      name.style.cursor = 'default';
      // Add name and replacement
      if (anchor) {
        if (anchor.originalChildren) {
          var title = anchor.originalTitle;
          var arrow = document.createElement('span');
          arrow.style.fontFamily = 'FontAwesome';
          arrow.style.color = '#888';
          arrow.style.margin = '0 6px';
          arrow.appendChild(document.createTextNode(String.fromCharCode(61537)));
          anchor.originalChildren.forEach(function(node) {
            name.appendChild(node.cloneNode(true));
          });
          if (title) {
            name.appendChild(document.createTextNode(' (' + title + ')'));
          }
          name.appendChild(arrow);
          for (var i = 0; i < anchor.childNodes.length; i++) {
            name.appendChild(anchor.childNodes[i].cloneNode(true));
          }
        } else {
          name.innerHTML = anchor.innerHTML;
          var title = anchor.title || anchor.dataset.originalTitle || anchor.parentNode.title || anchor.parentNode.dataset.originalTitle;
          if (title) {
            name.appendChild(document.createTextNode(' (' + title + ')'));
          }
        }
        if (!Storage.isTabVisible(hash)) {
          name.style.color = '#888';
        }
      } else {
        name.style.color = '#888';
        name.style.fontStyle = 'italic';
        name.appendChild(document.createTextNode(hash));
      }
      item.appendChild(name);
      tabPanel.appendChild(item);
    });
    $(tabPanel).sortable();
  }
  
  function createIconButton(icon, title) {
    var button = document.createElement('button');
    button.style.fontFamily = 'FontAwesome';
    button.style.border = 'none';
    button.style.background = 'none';
    button.style.padding = '0 2px';
    button.style.cursor = 'pointer';
    button.style.height = 'auto';
    button.style.outline = 'none';
    button.appendChild(document.createTextNode(icon));
    if (title) {
      button.title = title;
      $(button).tooltip();
    }
    return button;
  }

  function checkVersion() {
    var version = localStorage.tabprefs_version,
        scriptVersion = GM_info.script.version;
    if (!version) {
      showMessage(I18n.t('tabpreferences.update.first_run'));
      localStorage.tabprefs_version = scriptVersion;
    } else if (version !== scriptVersion) {
      if (versions.indexOf(version) === -1) {
        // There's tampering happening if we arrive here, just set to current version and ignore issue
        localStorage.tabprefs_version = scriptVersion;
        return;
      }
      var message = I18n.t('tabpreferences.update.message');
      for (var i = versions.indexOf(version)+1; i < versions.length; i++) {
        message += '\nv' + versions[i] + ':\n' + I18n.t('tabpreferences.update.v' + versions[i].replace(/\./g, '_'));
      }
      showMessage(message);
      localStorage.tabprefs_version = scriptVersion;
    }
  }

  function createTabConfigPane(container, hash) {
    var tabConfig = Storage.getTabConfig(hash),
        details = document.createElement('div'),
        iconDiv = document.createElement('div'),
        iconBtn = document.createElement('button'),
        icon = document.createElement('span'),
        nameDiv = document.createElement('div'),
        nameBtn = document.createElement('button'),
        titleDiv = document.createElement('div'),
        titleBtn = document.createElement('button'),
        reset = document.createElement('button'),
        close = document.createElement('button');
    iconBtn.appendChild(document.createTextNode((tabConfig.icon ? I18n.t('tabpreferences.prefs.change_icon') : I18n.t('tabpreferences.prefs.set_icon'))));
    iconBtn.style.margin = '0 10px';
    iconBtn.className = 'btn-link';
    iconBtn.addEventListener('click', function() {
      if (!iconBtn.icons) {
        var icons = document.createElement('div');
        icons.style.height = '10em';
        icons.style.overflow = 'auto';
        icons.style.letterSpacing = '5px';
        icons.style.fontSize = '12px';
        icons.style.wordWrap = 'break-word';
        // FontAwesome: symbols start at 'F000' (= 61440) and end at 'F295' in version 4.5 of FontAwesome (Waze uses 4.4)
        for (var i = 61440; i <= 62101; i++) {
          var icon = document.createElement('span');
          icon.style.fontFamily = 'FontAwesome';
          icon.appendChild(document.createTextNode(String.fromCharCode(i)));
          icon.style.cursor = 'pointer';
          icon.dataset.charCode = i;
          icon.addEventListener('click', function() {
            tabConfig.icon = {
              fontFamily: 'FontAwesome',
              charCode: this.dataset.charCode
            };
            Storage.setTabConfig(hash, tabConfig);
            container.removeChild(details);
            renameTabs(true);
            refreshTabPanel();
          });
          icons.appendChild(icon);
        }
        details.insertBefore(icons, reset);
        iconBtn.icons = icons;
      } else {
        details.removeChild(iconBtn.icons);
        iconBtn.icons = false;
      }
    });
    iconDiv.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.icon') + ': '));
    if (tabConfig.icon) {
      icon.style.fontFamily = tabConfig.icon.fontFamily;
      icon.appendChild(document.createTextNode(String.fromCharCode(tabConfig.icon.charCode)));
    } else {
      icon.style.fontStyle = 'italic';
      icon.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.icon_none')));
    }
    iconDiv.appendChild(icon);
    iconDiv.appendChild(document.createElement('br'));
    iconDiv.appendChild(iconBtn);
    details.appendChild(iconDiv);
    reset.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.reset_tab')));
    reset.style.margin = '0 5px';
    reset.className = 'btn btn-danger';
    reset.addEventListener('click', function() {
      Storage.removeTabConfig(hash);
      container.removeChild(details);
      container.details = false;
      renameTabs();
      refreshTabPanel();
    });
    details.appendChild(reset);
    close.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.close')));
    close.style.margin = '0 5px';
    close.className = 'btn btn-default';
    close.addEventListener('click', function() {
      container.removeChild(details);
      container.details = false;
    });
    details.appendChild(close);
    container.details = details;
    container.appendChild(details);
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
