const OCAU_MAILADDR = process.env.OCAU_MAILADDR;
const OCAU_SUBJECT_RX = /(?:([A-Z]+) - )?(.*)(?: - (New thread in watched forum)?)/;
const OCAU_TEXT_SEPARATOR = /----------------------------------------------------------------------/;
const OCAU_TEXT_URL = /https:\/\/forums\.overclockers\.com\.au.+?(?:\s+|$)/;

module.exports = (db, ocau, imm, logger) => {

  async function getContent(subject, text, ensureSubject=true) {
    // Get content from subject, and test if valid email is a new thread
    var matchObj = subject.match(OCAU_SUBJECT_RX);
    if (ensureSubject && (matchObj == null || matchObj[3] == null)) {
      return null;
    } else if (matchObj == null) {
      matchObj = [];
    }

    // Get location and title
    var loc = matchObj[1] || 'Unknown';
    var title = matchObj[2] || 'PM';

    // Split the mail text by the standard separator
    var textSections = text.split(OCAU_TEXT_SEPARATOR);
    var numSections = textSections.length;

    // Reform any co-incidental separators that appear in the actual text
    var contentSection = textSections.slice(1, numSections - 2).join(OCAU_TEXT_SEPARATOR).trim();
    
    // Select the section with the url to the thread
    var urlSection = textSections[numSections - 2];

    // Get URL from urlSection
    var url = urlSection.match(OCAU_TEXT_URL)[0].trim();

    // If mail is a thread (matches on subject), get metadata
    var forum = null;
    var openingPoster = null;
    if (ensureSubject == true) {
      var threadMeta = await ocau.getThreadMetadata(url);
      forum = threadMeta.forum;
      openingPoster = threadMeta.openingPoster;
    }

    return {
      title: title,
      location: loc,
      text: contentSection,
      forum: forum,
      openingPoster: openingPoster,
      url: url,
      tstamp: Date.now()
    };
  }

  async function mailHandler(topic, mail) {
    // Test 'from' address to check if this is an OCAU email
    if (mail.from.length != 1) {
      logger.error('Received mail from unknown sender, misformed mail?');
      return;
    } else if (mail.from[0].address != OCAU_MAILADDR) {
      logger.info(`Received email from ${mail.from[0].address}, ignoring`, 2);
      logger.info(`Message Text:\n ${mail.text}`, 3);
      return;
    }

    // Extract thread details from email
    var thread = await getContent(mail.subject, mail.text);

    // If email is not a 'new thread' email, forward it via PM
    if (thread == null) {
      thread = await getContent(mail.subject, mail.text, false);
      logger.info(`Received email from OCAU, (${mail.subject}) forwarding via PM...`, 2);
      imm.notify('parserForwardMail', thread);
      return;
    }

    // Insert into DB
    logger.info(`New thread: ${thread.title}`, 1);
    db.collection('threads').insertOne(thread);
    imm.notify('newThread', thread);
  }

  imm.subscribe('mailReceived', mailHandler);
}