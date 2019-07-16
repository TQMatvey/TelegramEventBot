const Bot = require("node-telegram-bot-api");
const Keyboard = require("node-telegram-keyboard-wrapper");
const token = process.env.TOKEN;
const ACTIONS = {
  RSVP: "RSVP"
};

let bot;
if (process.env.NODE_ENV === "production") {
  bot = new Bot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
  bot = new Bot(token, { polling: true });
}
console.log("Bot server started in the " + process.env.NODE_ENV + " mode");

let events = {};

const rsvpButtons = new Keyboard.InlineKeyboard();
rsvpButtons.addRow({ text: "👍  zusagen", callback_data: ACTIONS.RSVP });

bot.on("message", msg => {
  if (isEventText(msg.text)) {
    createEvent(msg);
  } else {
    deleteMessage(msg);
  }
});

function isEventText(text) {
  return text.indexOf("/event") === 0;
}

function createEvent(msg) {
  const eventDescription = removeBotCommand(msg.text);
  deleteMessage(msg);
  bot
    .sendMessage(msg.chat.id, eventDescription, {
      parse_mode: "markdown",
      ...rsvpButton.build()
    })
    .then(createdMsg => {
      const eventID = createEventIDFromMessage(createdMsg);
      events[eventID] = {
        text: eventDescription,
        attendees: []
      };
    });
}

function removeBotCommand(text) {
  return text.replace("/event ", "");
}

function deleteMessage(msg) {
  bot.deleteMessage(msg.chat.id, msg.message_id);
}

// RSVP to Event
bot.on("callback_query", query => {
  const eventID = createEventIDFromMessage(query.message);
  const attendeeUser = query.from;
  if (!rsvpedAlready(eventID, attendeeUser)) {
    events[eventID].attendees = getNewAttendeeList(
      events[eventID].attendees,
      attendeeUser
    );
    bot.answerCallbackQuery(query.id, { text: "" }).then(function() {
      bot.editMessageText(getEventTextWithAttendees(events[eventID]), {
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        parse_mode: "markdown",
        ...rsvpButton.build()
      });
    });
  }
});

function rsvpedAlready(eventID, user) {
  const nameOfNewAttendee = getFullNameString(user);
  return events[eventID].attendees.includes(nameOfNewAttendee);
}

function getNewAttendeeList(originalAttendees, attendeeUser) {
  const nameOfNewAttendee = getFullNameString(attendeeUser);
  if (originalAttendees.includes(nameOfNewAttendee)) {
    return originalAttendees;
  } else {
    return originalAttendees.concat(nameOfNewAttendee);
  }
}

function getFullNameString(user) {
  return [user.first_name, user.last_name]
    .filter(namePart => namePartIsPresent(namePart))
    .join(" ");
}

function namePartIsPresent(namePart) {
  return !!namePart;
}

function createEventIDFromMessage(msg) {
  return `${msg.chat.id}_${msg.message_id}`;
}

function getEventTextWithAttendees(event) {
  return `${event.text}\n\n*Zusagen:*${event.attendees.reduce(
    (attendeesString, attendee) => `${attendeesString}\n${attendee}`,
    ""
  )}`;
}

module.exports = bot;
