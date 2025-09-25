# Lottery App Requirements

## 1️ Platform

- Target: **Android**

- Framework: **Expo React Native**


## 2️ Lottery Mechanism

- **Spinning wheel**

    - Animates spinning

    - Gradually slows down to stop

- **Hide Picked Item Function**
    - Checkbox next to the wheel: when checked, each spun result is temporarily hidden from the wheel

    - Hidden options remain hidden even if switching templates or reopening the app

    - **Refresh button** next to the checkbox: restores all hidden options to be visible again

    - Both checkbox and refresh button are placed at the **bottom of Home (Spin Page) in the same row**

    - Distinction from enable/disable:

        - **Enable/Disable**: permanent until manually edited

        - **Hide Picked Item**: temporary, resettable by refresh


## 3️ Template Management

- **Template actions**

    - Create / Delete / Switch templates

- **Options inside a template**

    - Regular text options

    - Sub-template options

        - On selection, prompt user to enter sub-template and spin again

- **Option enable/disable**

    - Temporarily disable options

    - Disabled options do not appear on the wheel

    - Settings are persisted (saved locally)

    - **Note**: enable/disable is independent of hide/show

- **Editing Options**

    - Edit button placed **directly next to the template dropdown**

    - Clicking it opens the template editor immediately


## 4️ Lottery Results

- Display result after spinning

- If result is a sub-template → allow user to enter it and spin again

- If "Hide Picked Item" is enabled → spun option is hidden automatically


## 5️ Data Storage

- **Local storage (AsyncStorage)** for:

    - Template settings

    - Option enable/disable states

    - Sub-template relationships

    - Hide Picked Item states (persisted across sessions and template switches)


## 6️ UI / UX

- **Home (Spin Page)**

    - Wheel

    - Spin button

    - Hide Picked Item Checkbox + Refresh Hidden Items Button

- **Template Management Page**

    - Create / Delete / Switch templates

    - Edit template options

    - Enable / Disable options

    - Option types: regular text or sub-template

    - Quick Edit Button: directly next to template dropdown


# Build command
    as build --platform android --profile production