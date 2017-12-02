// ==UserScript==
// @name        WME Tab Manager
// @namespace   http://www.tomputtemans.com/
// @description Adjust the tabs in the Waze Map Editor to your liking by adjusting their size, hiding tabs or even renaming tabs completely.
// @include     /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor.*$/
// @icon        data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAA3CAYAAACo29JGAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wwCEzYBoD6dGgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACfUlEQVRo3u3aTUgUYRjA8b/bjKyziyyTH2VpKYoHDxLkaTFvRSJCeBHxpFBHCULoWgcpqL3VqZaQIIKULlKSBoqIGJjQQTE2T8YqbpCzrwuz63Zwxy5+pLTtzvY8txle5n1+PO/XDFP0c8tKU6DhoYBDcIITnOAE99/jtKMa2LaNUnGSts3Ozk5+VMTjQdN1jBIDvbj4wHZFh51QtpXCsrbyujo+nx/D5zte5Wzb3oOZponf70fTtLwAJZNJLMsiFosRj1vour5vBQ+cc0rF92CBQCBvYACaphEIBDBNczfXbXW8BSWVSgFgGEbeDkknNyfXP8clkwAUHzJhcx1Obk6uss8JTnCCy93x6+/FJgvvp1hVBhevXOPS6UKo3NoUI++WSDDHyMMQodBTJpbAmn/D6EIiq10feLbcWI8CUFdXd/KnJxZ4cusOr76BYZxCqQzGa2CkFIpaeh+/4GbzybuIRCIAlFdU/uPKeSs5X1UC2L9hAAmFsoGzLbQ0unJYWnz5MMemx7t7WRrk9vA4U2PPGQiWZpDf+Twxw1fLdbhJXt4LEZ5eB6CmvZsbF7zgr6eru50agPVpwg/u8mzSdbgKquvLMA19d63ciOIMzLXIKpsAuoFZdo7yUjcuKMBKuJ/+8AqgYzZeptmMsfhpmZgNtAww9qgLP25cUJhh9O2K8/pLbHmWj7MZGMD8ME9mXLvPBenta+NM7XUGh3poyNxt6Bli8Go15W199AZdfEKp6rzP606ARaJN4/yIVtHaGqSjKUhHlvvO+pzLduRwzslbgeAEJzjBCS6331CczdrtsZ+joCtXlE6n5Q8iwQlOcIITnOAEJzjBCe6I+AVAjNynsKm5WAAAAABJRU5ErkJggg==
// @version     1.3
// @require     https://bowercdn.net/c/html.sortable-0.4.4/dist/html.sortable.js
// @grant       none
// ==/UserScript==
(function() {
  var tabReopened = false, // have we reopened the tab from last time?
      timesRan = 0, // variable for sanity check
      tabsSecured = -1, // Up until which index have we fully rearranged the tabs?
      versions = ['0.1', '0.2', '1.0', '1.0.1', '1.0.2', '1.0.3', '1.0.4', '1.0.5', '1.1', '1.1.1', '1.1.2', '1.2', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.3'],
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
              tabwidth: localStorage.tabprefs_tabwidth,
              tabheight: localStorage.tabprefs_tabheight,
              preserveOrder: localStorage.tabprefs_preserveOrder,
              hidden: localStorage.tabprefs_hidden,
              configs: localStorage.tabprefs_configs
            });
          },
          importConfig: function(toImport) {
            console.log(toImport);
            var result = JSON.parse(toImport);
            ['configs', 'hidden', 'preserveOrder', 'reopenTab', 'tabheight', 'tabwidth'].forEach(function(key) {
              if (result[key]) {
                localStorage.setItem('tabprefs_' + key, result[key]);
              }
            });
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
    if (!Waze.loginManager.user) {
      Waze.loginManager.events.register("login", null, init);
      Waze.loginManager.events.register("loginStatus", null, init);
      if (!Waze.loginManager.user) {
        return;
      }
    }

    setTranslations({
      en: {
        prefs: {
          title: 'Tab Manager',
          tab_width: 'Tab width',
          tab_height: 'Tab height',
          reset: 'reset',
          preserve_tab: 'Preserve opened tab over sessions',
          remove_tab: 'Tab no longer available. Remove entry?',
          hide_tab: 'Change tab visibility',
          move_up_tab: 'Move up',
          move_down_tab: 'Move down',
          edit_tab: 'Edit tab',
          change: 'change',
          set: 'set',
          reset_tab: 'Reset tab',
          icon: 'Icon',
          background_color: 'Background color',
          text_color: 'Text color',
          none_set: 'None set',
          close: 'Close',
          reload: 'The page needs to reload for the changes to take effect. Do you want to refresh now?'
        },
        update: {
          first_run: 'Thanks for using Tab Manager!\nThe settings tab on the left contains additional options now.\nThis message will only appear one time.',
          message: 'New version installed! Changelog:',
          v0_1: '- Initial version with tab memory and order preservation',
          v0_2: '- Improvements to order preservation algorithm\n- Addition of version change messages',
          v1_0: '- Ability to hide a tab added\n- Ability to replace tab with symbol added\n- Ability to resize tabs added\n- Metadata icon added to userscript',
          v1_0_1: '- Fixed the script for Google Chrome',
          v1_0_2: '- Fixed tab size reset buttons in Google Chrome',
          v1_0_3: '- Tab styling is applied with higher specificity, but plays nicer with other scripts as well',
          v1_0_4: '- Tab alignment issues with renamed tabs in Google Chrome fixed',
          v1_0_5: '- Removed strict mode that was necessary for Google Chrome\n- Improved initalisation of script',
          v1_1: '- The list with tab names can now be dragged around\n- Quick tooltips for tabs with replaced names\n- Bug fix concerning the order of the last tabs with some missing tabs',
          v1_1_1: '- Problems with UTF8 in text editor resulted in missing icons',
          v1_1_2: '- Removed fixed scrollbar\n- Fixed a very rare potential bootstrap issue',
          v1_2: '- Renamed to Tab Manager\n- Translation fixes',
          v1_2_1: '- Added library to allow for sorting on WME beta',
          v1_2_2: '- Fixed minor issue concerning support for other languages',
          v1_2_3: '- Fix script activation on missing trailing slash in URL',
          v1_2_4: '- Internal fix for beta (hasUser function was removed)',
          v1_3: '- Added export/import functionality\n- Make it possible to recolour tabs\n- Recover from imperial/metric unit switches'
        }
      },
      nl: {
        prefs: {
          title: 'Tab manager',
          tab_width: 'Tabbreedte',
          tab_height: 'Tabhoogte',
          reset: 'reset',
          preserve_tab: 'Geopende tab bijhouden tussen sessies',
          remove_tab: 'Tab niet langer beschikbaar. Verwijderen?',
          hide_tab: 'Tabzichtbaarheid veranderen',
          move_up_tab: 'Eerder zetten',
          move_down_tab: 'Verder zetten',
          edit_tab: 'Tab aanpassen',
          change: 'veranderen',
          set: 'instellen',
          reset_tab: 'Tab resetten',
          icon: 'Icoon',
          background_color: 'Achtergrondkleur',
          text_color: 'Tekstkleur',
          none_set: 'Niet ingesteld',
          close: 'Sluiten',
          reload: 'De pagina moet opnieuw geladen worden om de wijzigingen door te voeren. Wil je nu de pagina vernieuwen?'
        }
      }
    });

    checkVersion();
    initTabListener();
    initSettings();

    setModeChangeListener();
    setUnitChangeListener();
  }

  function setTranslations(translations) {
    I18n.translations[I18n.currentLocale()].tabpreferences = translations.en;
    for (var i = 0; i < Object.keys(translations).length; i++) {
      var locale = Object.keys(translations)[i];
      if (I18n.currentLocale() == locale) {
        I18n.translations[locale].tabpreferences.prefs = translations[locale].prefs;
        return;
      }
    }
  }

  function setModeChangeListener() {
    if (Waze.app && Waze.app.modeController) {
      Waze.app.modeController.model.bind('change:mode', function(model, modeId) {
        if (modeId == 0) {
          reinitialize();
        }
      });
    } else {
      setTimeout(setModeChangeListener, 400);
    }
  }

  function setUnitChangeListener() {
    if (Waze.prefs) {
      Waze.prefs.on('change:isImperial', function() {setTimeout(reinitialize, 200); });
    } else {
      setTimeout(setUnitChangeListener, 400);
    }
  }

  function reinitialize() {
    tabReopened = false;
    tabsSecured = -1;
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
        adjustTabColors();
      });
    });
    for (var i = 0; i < tabs.children.length; i++) {
      selectionObserver.observe(tabs.children[i], { attributes: true, attributeFilter: ['class'] });
      if (tabs.children[i].title) {
        $(tabs.children[i]).tooltip({
          trigger: 'hover'
        });
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
              $(anchor).tooltip({
                trigger: 'hover'
              });
            }
            // Tab visibility
            if (!Storage.isTabVisible(hash)) {
              node.style.display = 'none';
            }
          }
          updateTabs();
          reorderTabs();
          if (localStorage.tabprefs_tabwidth || localStorage.tabprefs_tabheight) {
            resizeTabs();
          }
        }
      });
    });
    tabObserver.observe(tabs, { childList: true });

    var editPanelObserver = new MutationObserver(function(mutationRecords) {
      resizeTabs();
      console.log('Resize tabs called from observer');
    });
    editPanelObserver.observe(document.querySelector('#edit-panel .contents'), { childList: true });

    reopenTab();
    updateTabs();
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

    // First run
    if (localStorage.tabprefs_preserveOrder == null) {
      var tabs = document.querySelectorAll('#user-tabs .nav-tabs li a'),
          hashes = [];
      for (var i = 0; i < tabs.length; i++) {
        hashes.push(tabs[i].hash);
      }
      localStorage.tabprefs_preserveOrder = hashes.join();
    }

    var section = prefsTab.querySelector('.side-panel-section'),
        version = document.createElement('a'),
        heading = document.createElement('h4'),
        tabOrderPanel = document.createElement('ul'),
        configExportImport = document.createElement('div'),
        configExport = document.createElement('a'),
        configImport = document.createElement('input'),
        configImportLabel = document.createElement('label'),
        formGroup = document.createElement('div');
    version.href = 'https://www.waze.com/forum/viewtopic.php?f=819&t=168863';
    version.target = '_blank';
    version.style.float = 'right';
    version.appendChild(document.createTextNode('v' + GM_info.script.version));
    heading.style.paddingTop = '10px';
    heading.style.borderTop = '1px solid #e0e0e0';
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

    tabOrderPanel.className = 'result-list';
    tabOrderPanel.id = 'tabPreferencesOrder';
    formGroup.appendChild(tabOrderPanel);
    sortable(tabOrderPanel, {
      forcePlaceholderSize: true,
      placeholderClass: 'result'
    })[0].addEventListener('sortupdate', function(e) {
      var order = localStorage.tabprefs_preserveOrder.split(',');
      order.splice(e.detail.elementIndex, 0, order.splice(e.detail.oldElementIndex, 1)[0]);
      localStorage.tabprefs_preserveOrder = order.join();
      reorderTabs(true);
      refreshTabPanel();
    });

    configExportImport.style.textAlign = 'center';
    configExportImport.style.marginBottom = '1em';
    configExport.download = 'tab-manager.conf';
    configExport.style.textDecoration = 'none';
    configExport.href = '#';
    configExport.addEventListener('click', function() {
      configExport.href = 'data:application/octet-stream,' + encodeURIComponent(Storage.exportConfig());
    });
    configExport.innerHTML = '<i class="fa fa-upload"></i> Export</a>';
    configImport.id = 'tab-manager-import';
    configImport.type = 'file';
    configImport.accept = '.conf';
    configImport.style.display = 'none';
    configImportLabel.style.fontWeight = 'normal';
    configImportLabel.style.cursor = 'pointer';
    configImportLabel.style.marginLeft = '20px';
    configImportLabel.innerHTML = '<i class="fa fa-download"></i> Import';
    configImportLabel.htmlFor = configImport.id;
    configImport.addEventListener('change', function() {
      var reader = new FileReader();
      reader.addEventListener('load', function(e) {
        Storage.importConfig(reader.result);
        if (confirm(I18n.t('tabpreferences.prefs.reload'))) {
          window.location.reload();
        }
      });
      reader.readAsText(configImport.files[0]);
    });
    configExportImport.appendChild(configExport);
    configExportImport.appendChild(configImportLabel);
    configExportImport.appendChild(configImport);

    // Obsolete option, remove from localStorage
    if (localStorage.tabprefs_hidePermissions) {
      localStorage.removeItem('tabprefs_hidePermissions');
    }

    section.appendChild(version);
    section.appendChild(heading);
    section.appendChild(formGroup);
    section.appendChild(configExportImport);

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
    reset.className = 'btn-link pull-right';
    reset.addEventListener('click', function() {
      input.value = defaultValue;
      localStorage.removeItem(storageKey);
      eventHandler();
    });
    reset.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.reset')));
    var container = document.createElement('div');
    container.className = 'controls-container';
    container.appendChild(reset);
    container.appendChild(label);
    container.appendChild(input);
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
      log('Sanity limit reached! Tab Manager is most likely conflicting with another script. Backing off from now on.');
      // run one last time to increase counter
    }
    timesRan++;
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

  function resizeTabs() {
    var width = (localStorage.tabprefs_tabwidth ? localStorage.tabprefs_tabwidth : 15),
        height = (localStorage.tabprefs_tabheight ? localStorage.tabprefs_tabheight : 5),
        tabAnchors = document.querySelectorAll('#user-tabs .nav-tabs li a');
    for (var i = 0; i < tabAnchors.length; i++) {
      tabAnchors[i].style.cssText += ';padding:' + height + 'px ' + width + 'px !important';
      tabAnchors[i].style.height = 'auto';
    }
    if (!localStorage.tabprefs_adjustSidepanel) { // Work in progress for resizing of other sidepanel tabs
      return;
    }
    var editPanelAnchors = document.querySelectorAll('#edit-panel .nav.nav-tabs > li > a');
    for (var i = 0; i < editPanelAnchors.length; i++) {
      editPanelAnchors[i].style.cssText += ';padding:' + height + 'px ' + width + 'px !important';
    }
  }

  function saveTab(anchor) {
    if (!anchor.originalChildren) { // only do so if it hasn't been done yet
      var children = [];
      for (var j = 0; j < anchor.childNodes.length; j++) { // Bleh, nodelist doesn't support for each
        children.push(anchor.childNodes[j]);
      }
      anchor.originalTitle = anchor.title || anchor.dataset.originalTitle || anchor.parentNode.title || anchor.parentNode.dataset.originalTitle;
      if (!anchor.title) {
        anchor.title = anchor.textContent.trim();
      }
      $(anchor).tooltip({
        trigger: 'hover'
      });
      anchor.originalChildren = children;
    }
  }

  function restoreTab(anchor) {
    while (anchor.firstChild) {
      anchor.removeChild(anchor.firstChild);
    }
    anchor.originalChildren.forEach(function(node) {
      anchor.appendChild(node);
    });
    delete anchor.originalChildren;
    if (anchor.originalTitle) {
      anchor.title = anchor.originalTitle;
      $(anchor).tooltip({
        trigger: 'hover'
      });
    } else {
      anchor.removeAttribute('title');
      $(anchor).tooltip('destroy');
      delete anchor.dataset.originalTitle;
    }
    delete anchor.originalTitle;
  }

  function renameTabs(hash) {
    var tabs = document.querySelectorAll('#user-tabs .nav-tabs li a');
    for (var i = 0; i < tabs.length; i++) {
      var anchor = tabs[i],
          config = Storage.getTabConfig(anchor.hash);
      if (config && config.icon && (!anchor.originalChildren || hash == anchor.hash)) {
        saveTab(anchor);
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
      // Replacements have been removed, revert
      if (!config.icon && !config.name && anchor.originalChildren) {
        restoreTab(anchor);
      }
    }
  }

  function adjustTabColors() {
    var tabs = document.querySelectorAll('#user-tabs .nav-tabs li a');
    for (var i = 0; i < tabs.length; i++) {
      var anchor = tabs[i],
          config = Storage.getTabConfig(anchor.hash);
      anchor.style.borderBottomWidth = '0';
      if (config && (config.backgroundColor || config.color)) {
        saveTab(anchor);
      }
      anchor.style.backgroundColor = config && config.backgroundColor && !anchor.parentNode.classList.contains('active') ? config.backgroundColor : '';
      anchor.style.color = config && config.color && !anchor.parentNode.classList.contains('active') ? config.color : '';
    }
  }

  function updateTabs() {
    renameTabs();
    adjustTabColors();
  }

  function refreshTabPanel() {
    var tabPanel = document.getElementById('tabPreferencesOrder');
    if (!tabPanel) {
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
          moveUp = createIconButton('fa-chevron-up', I18n.t('tabpreferences.prefs.move_up_tab')),
          moveDown = createIconButton('fa-chevron-down', I18n.t('tabpreferences.prefs.move_down_tab')),
          remove = createIconButton('fa-remove', I18n.t('tabpreferences.prefs.remove_tab')),
          hide = createIconButton((Storage.isTabVisible(hash) ? 'fa-eye' : 'fa-eye-slash'), I18n.t('tabpreferences.prefs.hide_tab')),
          edit = createIconButton('fa-pencil', I18n.t('tabpreferences.prefs.edit_tab')),
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
              this.classList.remove('fa-eye');
              this.classList.add('fa-eye-slash');
              anchor.parentNode.style.display = 'none';
              Storage.setTabVisibility(hash, false);
            } else {
              this.classList.remove('fa-eye-slash');
              this.classList.add('fa-eye');
              anchor.parentNode.style.display = 'block';
              Storage.setTabVisibility(hash, true);
            }
            refreshTabPanel();
          });
          hide.addEventListener('mouseenter', function() {
            this.classList.toggle('fa-eye-slash', Storage.isTabVisible(hash));
            this.classList.toggle('fa-eye', !Storage.isTabVisible(hash));
          });
          hide.addEventListener('mouseleave', function() {
            this.classList.toggle('fa-eye', Storage.isTabVisible(hash));
            this.classList.toggle('fa-eye-slash', !Storage.isTabVisible(hash));
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
      item.style.cursor = 'default';
      item.appendChild(buttons);
      var handle = document.createElement('span');
      handle.className = 'fa fa-reorder';
      handle.style.padding = '3px';
      handle.style.color = '#c2c2c2';
      handle.style.cursor = 'move';
      handle.style.fontSize = '11px';
      handle.style.float = 'left';
      handle.style.marginLeft = '-16px';
      item.appendChild(handle);
      name.style.cursor = 'default';
      name.style.marginLeft = '3px';
      name.style.fontSize = '12px';
      name.style.fontWeight = '600';
      name.style.color = '#3d3d3d';
      // Add name and replacement
      if (anchor) {
        var title;
        if (tabConfig.icon || tabConfig.backgroundColor || tabConfig.color) {
          title = anchor.originalTitle;
          var arrow = document.createElement('span');
          arrow.className = 'fa fa-arrow-right';
          arrow.style.color = '#888';
          arrow.style.margin = '0 6px';
          anchor.originalChildren.forEach(function(node) {
            name.appendChild(node.cloneNode(true));
          });
          if (title) {
            name.appendChild(document.createTextNode(' (' + title + ')'));
          }
          name.appendChild(arrow);
          var replacement = document.createElement('span');
          replacement.style.padding = '2px 4px';
          replacement.style.borderRadius = '5px';
          replacement.style.backgroundColor = tabConfig.backgroundColor || '';
          replacement.style.color = tabConfig.color || '';
          for (var i = 0; i < anchor.childNodes.length; i++) {
            if (anchor.childNodes[i].textContent == '\n') {
              continue;
            }
            replacement.appendChild(anchor.childNodes[i].cloneNode(true));
          }
          name.appendChild(replacement);
        } else {
          name.innerHTML = anchor.innerHTML;
          title = anchor.title || anchor.dataset.originalTitle || anchor.parentNode.title || anchor.parentNode.dataset.originalTitle;
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
    sortable(tabPanel);
  }

  function createIconButton(icon, title) {
    var button = document.createElement('button');
    button.className = 'fa ' + icon;
    button.style.border = 'none';
    button.style.background = 'none';
    button.style.padding = '0 2px';
    button.style.cursor = 'pointer';
    button.style.height = 'auto';
    button.style.outline = 'none';
    if (title) {
      button.title = title;
      $(button).tooltip({
        trigger: 'hover'
      });
    }
    return button;
  }

  function createDetailsLabel(text) {
    var block = document.createElement('div');
    block.textContent = text;
    block.style.flex = 'auto';
    block.style.width = '50%';
    block.style.padding = '0 4%';
    block.style.margin = '5px 0';
    block.classList.add('text-right');
    return block;
  }

  function createDetailsInfo() {
    var block = document.createElement('div');
    block.style.flex = 'auto';
    block.style.width = '50%';
    block.style.margin = '5px 0';
    return block;
  }

  function createColorChooser(propertyName, hash) {
    var div = createDetailsInfo(),
        btn = document.createElement('a'),
        input = document.createElement('input'),
        noneSet = document.createElement('span'),
        tabConfig = Storage.getTabConfig(hash);
    input.type = 'color';
    input.classList.toggle('hidden', !tabConfig[propertyName]);
    var eventListener = function() {
      tabConfig[propertyName] = input.value;
      Storage.setTabConfig(hash, tabConfig);
      adjustTabColors();
    };
    input.addEventListener('input', eventListener);
    input.addEventListener('change', eventListener);
    div.appendChild(input);
    noneSet.style.fontStyle = 'italic';
    noneSet.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.none_set')));
    noneSet.classList.toggle('hidden', tabConfig[propertyName] != undefined);
    div.appendChild(noneSet);
    btn.style.marginLeft = '10px';
    btn.style.cursor = 'pointer';
    btn.textContent = tabConfig[propertyName] ? I18n.t('tabpreferences.prefs.reset') : I18n.t('tabpreferences.prefs.set');
    btn.addEventListener('click', function(e) {
      noneSet.classList.toggle('hidden');
      input.classList.toggle('hidden');
      btn.textContent = input.classList.contains('hidden') ? I18n.t('tabpreferences.prefs.set') : I18n.t('tabpreferences.prefs.reset');
      if (!input.classList.contains('hidden')) {
        input.dispatchEvent(new MouseEvent(e.type, e));
      } else {
        delete tabConfig[propertyName];
        Storage.setTabConfig(hash, tabConfig);
        adjustTabColors();
      }
    });
    div.appendChild(btn);
    if (tabConfig[propertyName]) {
      input.value = tabConfig[propertyName];
    }
    return div;
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
        iconDiv = createDetailsInfo(),
        iconBtn = document.createElement('a'),
        icon = document.createElement('span'),
        reset = document.createElement('button'),
        close = document.createElement('button');
    details.appendChild(createDetailsLabel(I18n.t('tabpreferences.prefs.icon')));
    iconBtn.appendChild(document.createTextNode((tabConfig.icon ? I18n.t('tabpreferences.prefs.change') : I18n.t('tabpreferences.prefs.set'))));
    iconBtn.style.marginLeft = '10px';
    iconBtn.style.cursor = 'pointer';
    iconBtn.addEventListener('click', function() {
      if (!iconBtn.icons) {
        var icons = document.createElement('div');
        icons.style.height = '10em';
        icons.style.overflow = 'auto';
        icons.style.fontSize = '12px';
        icons.style.wordWrap = 'break-word';
        icons.style.fontFamily = 'FontAwesome';
        // FontAwesome: symbols start at 'F000' (= 61440) and end at 'F2E0' in version 4.7 of FontAwesome (Waze uses 4.7)
        for (var i = 61440; i <= 62177; i++) {
          var icon = document.createElement('div');
          icon.appendChild(document.createTextNode(String.fromCharCode(i)));
          icon.style.cursor = 'pointer';
          icon.style.width = '1.28571em';
          icon.style.float = 'left';
          icon.style.marginRight = '1px';
          icon.style.textAlign = 'center';
          icon.dataset.charCode = i;
          icon.addEventListener('click', function() {
            tabConfig.icon = {
              fontFamily: 'FontAwesome',
              charCode: this.dataset.charCode
            };
            Storage.setTabConfig(hash, tabConfig);
            container.removeChild(details);
            renameTabs(hash);
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
    if (tabConfig.icon) {
      icon.style.fontFamily = tabConfig.icon.fontFamily;
      icon.appendChild(document.createTextNode(String.fromCharCode(tabConfig.icon.charCode)));
    } else {
      icon.style.fontStyle = 'italic';
      icon.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.none_set')));
    }
    iconDiv.appendChild(icon);
    iconDiv.appendChild(iconBtn);
    details.appendChild(iconDiv);
    details.appendChild(createDetailsLabel(I18n.t('tabpreferences.prefs.background_color')));
    details.appendChild(createColorChooser('backgroundColor', hash));
    details.appendChild(createDetailsLabel(I18n.t('tabpreferences.prefs.text_color')));
    details.appendChild(createColorChooser('color', hash));
    reset.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.reset_tab')));
    reset.style.margin = '0 5px';
    reset.className = 'btn btn-danger';
    reset.addEventListener('click', function() {
      Storage.removeTabConfig(hash);
      container.removeChild(details);
      container.details = false;
      updateTabs();
      refreshTabPanel();
    });
    details.appendChild(reset);
    close.appendChild(document.createTextNode(I18n.t('tabpreferences.prefs.close')));
    close.style.margin = '0 5px';
    close.className = 'btn btn-default';
    close.addEventListener('click', function() {
      container.removeChild(details);
      container.details = false;
      refreshTabPanel();
    });
    details.appendChild(close);
    details.style.borderLeft = '5px solid #eee';
    details.style.marginTop = '10px';
    details.style.display = 'flex';
    details.style.flexWrap = 'wrap';
    details.style.alignItems = 'start';
    container.details = details;
    container.appendChild(details);
  }

  function showMessage(message) {
    alert('Tab Manager\n=============\n' + message);
  }

  function log(message) {
    if (console.log) {
      console.log('%cWME Tab Manager: %c' + message, 'color:black', 'color:#d97e00');
    }
  }

  init();
})();
