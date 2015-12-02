# WME Tab Preferences

This userscript augments the [Waze Map Editor](https://www.waze.com/editor/) by providing additional settings concerning the tabs. This script preserves the order of the tabs and reopens the tab you had open the last time you used the WME.

### Current features

- Reopen the tab you had open the last time you used the WME
- Preserve the order of the tabs over sessions
- Reorder the tabs in any way you like
- Make the width of the sidepanel constant by adding the scrollbar by default
- Make it possible to hide the paragraph that details how far you can edit and save valuable screen estate

## Installation instructions

> TL;DR: install as most other WME userscripts from its [Greasy Fork page](https://greasyfork.org/scripts/14316-wme-tab-preferences)

Userscripts are snippets of code that are executed after the loading of certain webpages. This script does this after the loading of the Waze Map Editor. In order to run userscripts in your browser, you are adviced to use Firefox or Google Chrome.

You will need to install an add-on that manages userscripts for this to work. If you use Firefox, you should install [GreaseMonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/) and for Google Chrome you should install [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).

These add-ons will be visible in the browser with an additional button that is visible to the right of the address bar. Through this button it will be possible to maintain any userscripts you install.

For WME Tab Preferences, you should be able to install the script at [Greasy Fork](https://greasyfork.org/scripts/14316-wme-tab-preferences). There will be a big green install button which you will have to press to install the script.
__When installing userscripts always pay attention to the site(s) on which the script runs.__ This script only runs on Waze.com, so other sites will not be affected in any way.

After installing a userscript, you will be able to find it working on the site(s) specified. Do note that if you had the page open before installing the userscript, you will first need to refresh the page.

GreaseMonkey and TamperMonkey will occasionally check for new versions of these scripts. You will get a notification when a new version has been found and installed.

## How to use

![Tab Preferences menu](https://tomputtemans.com/waze-scripts/images/WME-TabPreferences-menu.png)

The script adds additional options to the preferences tab. These options allow you to enable or disable the script's features:

- 'Hide editing permissions paragraph': remove the paragraph saying how far you can edit as this isn't really useful information for an advanced editor.
- 'Preserve opened tab over sessions': have the script reopen the tab you had selected during the last time you used the WME.
- 'Preserve tab order over sessions': have the script rearrange the tabs to preserve the previous order when loading the WME. New tabs are added to the back. When selecting this option, an additional menu appears that allows you to rearrange the tabs to your liking.

![Tab Preferences tab rearrangement](https://tomputtemans.com/waze-scripts/images/WME-TabPreferences-tab-rearrange.png)

## Feedback and suggestions

I maintain a list of 'issues' I may want to work on at the [GitHub project page](https://github.com/Glodenox/wme-tabpreferences/issues). There is also a [forum thread on the Waze forums](https://www.waze.com/forum/viewtopic.php?f=819&t=168863) in which discussion can take place.
