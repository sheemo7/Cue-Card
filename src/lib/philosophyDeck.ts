import { Cue, DeckSession, HUES } from '../types';
import { generateBeepBlob } from './sampleDeck';

export interface PhilosophyQuote {
  id: string;
  name: string;
  speaker: string;
  work: string;
  year?: string;
  readingTimeSeconds: number; // strictly < 120s
  wordCount: number;
  inEarPrompt: string; // Whispered trigger in ear
  script: string;      // Full recitation text
  tags: string[];
  hue: string;
  freq: number;
}

export const PHILOSOPHY_20_QUOTES: PhilosophyQuote[] = [
  {
    id: 'phil-01-marcus',
    name: '01. Marcus Aurelius · Meditations',
    speaker: 'Marcus Aurelius',
    work: 'Meditations (Book II, Section 1)',
    year: '180 AD',
    readingTimeSeconds: 45,
    wordCount: 118,
    inEarPrompt: 'When you wake up: None can hurt me. We were made for cooperation.',
    script:
      'When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil.\n\n' +
      'But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own.\n\n' +
      'None of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my kin, or hate them. We were made for cooperation, like feet, like hands, like the rows of the upper and lower teeth.',
    tags: ['Philosophy', 'Anchor', 'Calm'],
    hue: HUES[0],
    freq: 523.25,
  },
  {
    id: 'phil-02-hamlet',
    name: '02. Shakespeare · Hamlet ("To Be or Not To Be")',
    speaker: 'William Shakespeare (Hamlet)',
    work: 'Hamlet (Act III, Scene 1)',
    year: 'c. 1601',
    readingTimeSeconds: 55,
    wordCount: 135,
    inEarPrompt: 'To be or not to be: Suffer the slings, or take arms against troubles.',
    script:
      'To be, or not to be, that is the question:\n' +
      "Whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles and by opposing end them.\n\n" +
      'To die—to sleep, no more; and by a sleep to say we end the heart-ache and the thousand natural shocks that flesh is heir to: \'tis a consummation devoutly to be wish\'d.\n\n' +
      "To die, to sleep; to sleep, perchance to dream—ay, there's the rub: for in that sleep of death what dreams may come, when we have shuffled off this mortal coil, must give us pause.",
    tags: ['Philosophy', 'Keynote', 'Anchor'],
    hue: HUES[1],
    freq: 587.33,
  },
  {
    id: 'phil-03-arena',
    name: '03. Theodore Roosevelt · The Man in the Arena',
    speaker: 'Theodore Roosevelt',
    work: 'Citizenship in a Republic (Sorbonne, Paris)',
    year: 'April 23, 1910',
    readingTimeSeconds: 65,
    wordCount: 142,
    inEarPrompt: 'Not the critic: The credit belongs to the man in the arena with dust and blood.',
    script:
      'It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better.\n\n' +
      'The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood; who strives valiantly; who errs, who comes short again and again, because there is no effort without error and shortcoming;\n\n' +
      'but who does actually strive to do the deeds; who knows great enthusiasms, the great devotions; who spends himself in a worthy cause; who at the best knows in the end the triumph of high achievement, and who at the worst, if he fails, at least fails while daring greatly.',
    tags: ['Philosophy', 'Inspirational', 'Confidence'],
    hue: HUES[2],
    freq: 659.25,
  },
  {
    id: 'phil-04-socrates',
    name: '04. Socrates · The Apology (Unexamined Life)',
    speaker: 'Socrates (Plato)',
    work: 'The Apology of Socrates (38a, 41d)',
    year: '399 BC',
    readingTimeSeconds: 55,
    wordCount: 130,
    inEarPrompt: 'Virtue over wealth. The unexamined life is not worth living.',
    script:
      'I say to you that virtue does not come from wealth, but from virtue comes wealth and all other human goods to men, both in private and in public.\n\n' +
      'For I do nothing other than go about persuading you all, old and young, not to care for your bodies or your money, but for your soul above all, and how it will be best.\n\n' +
      'The unexamined life is not worth living for a human being.\n\n' +
      'The hour of departure has arrived, and we go our separate ways—I to die, and you to live. Which is better only the gods know. But be of good cheer, and know of a certainty, that no evil can happen to a good man, either in life or after death.',
    tags: ['Philosophy', 'Anchor', 'Confidence'],
    hue: HUES[3],
    freq: 698.46,
  },
  {
    id: 'phil-05-seneca',
    name: '05. Seneca · On the Shortness of Life',
    speaker: 'Lucius Annaeus Seneca',
    work: 'De Brevitate Vitae (Chapter 1)',
    year: '49 AD',
    readingTimeSeconds: 50,
    wordCount: 114,
    inEarPrompt: 'Life is not short: we waste it. Generous time is given if invested well.',
    script:
      'It is not that we have a short time to live, but that we waste a lot of it. Life is long enough, and a sufficiently generous estimate has been given to us for the highest achievements, if it were all well invested.\n\n' +
      'But when it is squandered in luxury and heedlessness, when it is spent on no good activity, we are forced at last by the final constraint to realize that it has passed away before we knew it was on its way.\n\n' +
      'So it is: we are not given a short life but we make it short, and we are not ill-supplied, but wasteful of it.',
    tags: ['Philosophy', 'Calm', 'Anchor'],
    hue: HUES[4],
    freq: 783.99,
  },
  {
    id: 'phil-06-epictetus',
    name: '06. Epictetus · The Dichotomy of Control',
    speaker: 'Epictetus',
    work: 'Enchiridion (Chapter 1)',
    year: 'c. 125 AD',
    readingTimeSeconds: 55,
    wordCount: 125,
    inEarPrompt: 'In our control: opinions and desires. Outside: body and reputation. Confuse them and suffer.',
    script:
      'Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions.\n\n' +
      'Things not in our control are body, property, reputation, command, and, in one word, whatever are not our own actions.\n\n' +
      'The things in our control are by nature free, unrestrained, unhindered; but those not in our control are weak, slavish, restrained, belonging to others.\n\n' +
      'Remember, then, that if you suppose that things which are slavish are also free, and that what belongs to others is your own, then you will be hindered. You will lament, you will be disturbed, and you will find fault both with gods and men.',
    tags: ['Philosophy', 'Rebuttal', 'Confidence'],
    hue: HUES[5],
    freq: 880.0,
  },
  {
    id: 'phil-07-crispin',
    name: '07. Shakespeare · Henry V (Band of Brothers)',
    speaker: 'William Shakespeare (King Henry V)',
    work: 'Henry V (Act IV, Scene 3)',
    year: '1599',
    readingTimeSeconds: 50,
    wordCount: 124,
    inEarPrompt: 'Let him depart who fears: We few, we happy few, we band of brothers.',
    script:
      'He which hath no stomach to this fight, let him depart; his passport shall be made, and crowns for convoy put into his purse.\n\n' +
      'We would not die in that man\'s company that fears his fellowship to die with us. This day is call\'d the feast of Crispian:\n\n' +
      'He that outlives this day, and comes safe home, will stand a tip-toe when this day is nam\'d, and rouse him at the name of Crispian. Then will he strip his sleeve and show his scars, and say "These wounds I had on Crispin\'s day."\n\n' +
      'We few, we happy few, we band of brothers; for he to-day that sheds his blood with me shall be my brother!',
    tags: ['Philosophy', 'Inspirational', 'Keynote'],
    hue: HUES[6],
    freq: 440.0,
  },
  {
    id: 'phil-08-gettysburg',
    name: '08. Abraham Lincoln · Gettysburg Address',
    speaker: 'Abraham Lincoln',
    work: 'Gettysburg Battlefield Dedication',
    year: 'November 19, 1863',
    readingTimeSeconds: 60,
    wordCount: 145,
    inEarPrompt: 'Conceived in liberty: Government of the people, by the people, for the people, shall not perish.',
    script:
      'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.\n\n' +
      'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.\n\n' +
      'It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom—and that government of the people, by the people, for the people, shall not perish from the earth.',
    tags: ['Philosophy', 'Keynote', 'Anchor'],
    hue: HUES[7],
    freq: 493.88,
  },
  {
    id: 'phil-09-mlk',
    name: '09. Martin Luther King Jr. · "I Have a Dream"',
    speaker: 'Dr. Martin Luther King Jr.',
    work: 'March on Washington (Lincoln Memorial)',
    year: 'August 28, 1963',
    readingTimeSeconds: 55,
    wordCount: 128,
    inEarPrompt: 'I have a dream: Judged not by color, but by the content of character.',
    script:
      'I say to you today, my friends, that even though we face the difficulties of today and tomorrow, I still have a dream. It is a dream deeply rooted in the American dream.\n\n' +
      'I have a dream that one day this nation will rise up and live out the true meaning of its creed: "We hold these truths to be self-evident, that all men are created equal."\n\n' +
      'I have a dream that my four little children will one day live in a nation where they will not be judged by the color of their skin but by the content of their character. I have a dream today!\n\n' +
      'With this faith, we will be able to hew out of the mountain of despair a stone of hope.',
    tags: ['Philosophy', 'Inspirational', 'Keynote'],
    hue: HUES[0],
    freq: 523.25,
  },
  {
    id: 'phil-10-pericles',
    name: '10. Pericles · Funeral Oration (Freedom & Courage)',
    speaker: 'Pericles (Thucydides)',
    work: 'History of the Peloponnesian War (Book II.37-43)',
    year: '431 BC',
    readingTimeSeconds: 55,
    wordCount: 126,
    inEarPrompt: 'Model to others: Secret of happiness is freedom, secret of freedom is courage.',
    script:
      'Our form of government does not emulate the institutions of our neighbours. We are a model to others rather than their imitators. Our constitution is called a democracy because power is in the hands not of a minority but of the whole people.\n\n' +
      'When it is a question of settling private disputes, everyone is equal before the law. We are open to the world, and never by alien acts exclude foreigners from any opportunity of learning or observing.\n\n' +
      'Fix your eyes day by day upon the greatness of the city, and remember that courage, a sense of duty, and a keen feeling of honour in action made her great. For the secret of happiness is freedom, and the secret of freedom is courage.',
    tags: ['Philosophy', 'Anchor', 'Confidence'],
    hue: HUES[1],
    freq: 587.33,
  },
  {
    id: 'phil-11-emerson',
    name: '11. Ralph Waldo Emerson · Self-Reliance',
    speaker: 'Ralph Waldo Emerson',
    work: 'Essays: First Series (Self-Reliance)',
    year: '1841',
    readingTimeSeconds: 65,
    wordCount: 138,
    inEarPrompt: 'Trust thyself: Nothing is sacred but integrity of your mind. To be great is to be misunderstood.',
    script:
      'Trust thyself: every heart vibrates to that iron string. Accept the place the divine providence has found for you, the society of your contemporaries, the connection of events.\n\n' +
      'Whoso would be a man must be a nonconformist. Nothing is at last sacred but the integrity of your own mind. A foolish consistency is the hobgoblin of little minds, adored by little statesmen and philosophers and divines.\n\n' +
      'Speak what you think now in hard words, and tomorrow speak what tomorrow thinks in hard words again, though it contradict every thing you said today.\n\n' +
      'Is it so bad, then, to be misunderstood? Pythagoras was misunderstood, and Socrates, and Jesus, and Luther, and Copernicus, and Galileo, and Newton. To be great is to be misunderstood.',
    tags: ['Philosophy', 'Inspirational', 'Confidence'],
    hue: HUES[2],
    freq: 659.25,
  },
  {
    id: 'phil-12-nietzsche',
    name: '12. Friedrich Nietzsche · Thus Spoke Zarathustra',
    speaker: 'Friedrich Nietzsche',
    work: 'Thus Spoke Zarathustra (Prologue & Maxims)',
    year: '1883',
    readingTimeSeconds: 50,
    wordCount: 110,
    inEarPrompt: 'Man is a rope over an abyss: A bridge and not an end. What does not kill me makes me stronger.',
    script:
      'I teach you the overman. Man is something that shall be overcome. What have you done to overcome him?\n\n' +
      'All beings so far have created something beyond themselves; and do you want to be the ebb of this great flood?\n\n' +
      'Man is a rope, tied between beast and overman—a rope over an abyss. A dangerous across, a dangerous on-the-way, a dangerous looking-back, a dangerous shuddering and stopping.\n\n' +
      'What is great in man is that he is a bridge and not an end: what can be loved in man is that he is an overture and a going under. Out of life\'s school of war: what does not destroy me makes me stronger.',
    tags: ['Philosophy', 'Confidence', 'Rebuttal'],
    hue: HUES[3],
    freq: 698.46,
  },
  {
    id: 'phil-13-churchill',
    name: '13. Winston Churchill · "We Shall Fight on the Beaches"',
    speaker: 'Winston Churchill',
    work: 'House of Commons Speech',
    year: 'June 4, 1940',
    readingTimeSeconds: 50,
    wordCount: 116,
    inEarPrompt: 'Fight on the beaches, in the streets, in the hills: We shall never surrender.',
    script:
      'We shall not flag or fail. We shall go on to the end. We shall fight in France, we shall fight on the seas and oceans, we shall fight with growing confidence and growing strength in the air, we shall defend our island, whatever the cost may be.\n\n' +
      'We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets, we shall fight in the hills; we shall never surrender,\n\n' +
      'and even if, which I do not for a moment believe, this island or a large part of it were subjugated and starving, then our Empire beyond the seas would carry on the struggle, until, in God\'s good time, the New World steps forth to the rescue and the liberation of the old.',
    tags: ['Philosophy', 'Keynote', 'Confidence'],
    hue: HUES[4],
    freq: 783.99,
  },
  {
    id: 'phil-14-stage',
    name: '14. Shakespeare · As You Like It ("All the World\'s a Stage")',
    speaker: 'William Shakespeare (Jaques)',
    work: 'As You Like It (Act II, Scene 7)',
    year: '1603',
    readingTimeSeconds: 60,
    wordCount: 132,
    inEarPrompt: 'All the world\'s a stage: Merely players, exits and entrances, playing seven ages.',
    script:
      'All the world\'s a stage, and all the men and women merely players; they have their exits and their entrances, and one man in his time plays many parts, his acts being seven ages.\n\n' +
      'At first, the infant, mewling and puking in the nurse\'s arms. Then the whining schoolboy, with his satchel and shining morning face, creeping like snail unwillingly to school.\n\n' +
      'And then the lover, sighing like furnace. Then a soldier, full of strange oaths and bearded like the pard, jealous in honour, sudden and quick in quarrel, seeking the bubble reputation even in the cannon\'s mouth.\n\n' +
      'Last scene of all, that ends this strange eventful history, is second childishness and mere oblivion, sans teeth, sans eyes, sans taste, sans everything.',
    tags: ['Philosophy', 'Keynote', 'Anchor'],
    hue: HUES[5],
    freq: 880.0,
  },
  {
    id: 'phil-15-cicero',
    name: '15. Marcus Tullius Cicero · True Law and Reason',
    speaker: 'Marcus Tullius Cicero',
    work: 'De Re Publica (Book III.33)',
    year: '54 BC',
    readingTimeSeconds: 60,
    wordCount: 134,
    inEarPrompt: 'True law is right reason: Universal, unchanging, eternal for all nations.',
    script:
      'True law is right reason in agreement with nature; it is of universal application, unchanging and everlasting. It summons to duty by its commands, and averts from wrongdoing by its prohibitions.\n\n' +
      'And it does not lay its commands or prohibitions upon good men in vain, though neither have any effect on the wicked.\n\n' +
      'It is a sin to try and alter this law, nor is it allowable to attempt to repeal any part of it, and it is impossible to abolish it entirely. We cannot be freed from its obligations by senate or people, and we need not look outside ourselves for an expounder or interpreter of it.\n\n' +
      'There will not be different laws at Rome and at Athens, but one eternal and unchangeable law will be valid for all nations and all times.',
    tags: ['Philosophy', 'Anchor', 'Confidence'],
    hue: HUES[6],
    freq: 440.0,
  },
  {
    id: 'phil-16-henley',
    name: '16. William Ernest Henley · Invictus',
    speaker: 'William Ernest Henley',
    work: 'Invictus (Book of Verses)',
    year: '1875',
    readingTimeSeconds: 45,
    wordCount: 110,
    inEarPrompt: 'Bloody but unbowed: Master of my fate, captain of my soul.',
    script:
      'Out of the night that covers me, black as the pit from pole to pole, I thank whatever gods may be for my unconquerable soul.\n\n' +
      'In the fell clutch of circumstance I have not winced nor cried aloud. Under the bludgeonings of chance my head is bloody, but unbowed.\n\n' +
      'Beyond this place of wrath and tears looms but the Horror of the shade, and yet the menace of the years finds and shall find me unafraid.\n\n' +
      'It matters not how strait the gate, how charged with punishments the scroll, I am the master of my fate, I am the captain of my soul.',
    tags: ['Philosophy', 'Confidence', 'Inspirational'],
    hue: HUES[7],
    freq: 493.88,
  },
  {
    id: 'phil-17-cave',
    name: '17. Plato · Republic (The Allegory of the Cave)',
    speaker: 'Plato (Socrates)',
    work: 'The Republic (Book VII, 514a-516a)',
    year: 'c. 375 BC',
    readingTimeSeconds: 65,
    wordCount: 140,
    inEarPrompt: 'The Cave: Shadows mistaken for truth. Turn toward the light despite the glare.',
    script:
      'Behold! Human beings living in an underground den, which has a mouth open towards the light. Here they have been from their childhood, and have their legs and necks chained so that they can only see before them.\n\n' +
      'To them, the truth would be literally nothing but the shadows of the images.\n\n' +
      'Now look again, and see what will naturally follow if the prisoners are released and disabused of their error. At first, when any of them is liberated and compelled suddenly to stand up and turn his neck and walk towards the light, he will suffer sharp pains; the glare will distress him, and he will be unable to see the realities of which in his former state he had seen the shadows.\n\n' +
      'Yet once his eyes adjust to the sun, he would rather suffer anything than live like them.',
    tags: ['Philosophy', 'Anchor', 'Keynote'],
    hue: HUES[0],
    freq: 523.25,
  },
  {
    id: 'phil-18-macbeth',
    name: '18. Shakespeare · Macbeth ("Tomorrow, and tomorrow")',
    speaker: 'William Shakespeare (Macbeth)',
    work: 'Macbeth (Act V, Scene 5)',
    year: '1606',
    readingTimeSeconds: 45,
    wordCount: 104,
    inEarPrompt: 'Tomorrow and tomorrow: Life is a walking shadow, out brief candle.',
    script:
      'She should have died hereafter; there would have been a time for such a word.\n\n' +
      'Tomorrow, and tomorrow, and tomorrow, creeps in this petty pace from day to day to the last syllable of recorded time, and all our yesterdays have lighted fools the way to dusty death.\n\n' +
      'Out, out, brief candle! Life\'s but a walking shadow, a poor player that struts and frets his hour upon the stage and then is heard no more.\n\n' +
      'It is a tale told by an idiot, full of sound and fury, signifying nothing.',
    tags: ['Philosophy', 'Calm', 'Keynote'],
    hue: HUES[1],
    freq: 587.33,
  },
  {
    id: 'phil-19-gibran',
    name: '19. Kahlil Gibran · The Prophet (On Giving)',
    speaker: 'Kahlil Gibran (Almustafa)',
    work: 'The Prophet (On Giving)',
    year: '1923',
    readingTimeSeconds: 55,
    wordCount: 122,
    inEarPrompt: 'Give of yourself: Life gives unto life, and joy is your reward.',
    script:
      'You give but little when you give of your possessions. It is when you give of yourself that you truly give.\n\n' +
      'For what are your possessions but things you keep and guard for fear you may need them tomorrow? And what of him who has deserved to drink from the ocean of life and deserve to fill his cup from your little stream?\n\n' +
      'See first that you yourself deserve to be a giver, and an instrument of giving. For in truth it is life that gives unto life—while you, who deem yourself a giver, are but a witness.\n\n' +
      'There are those who give with joy, and that joy is their reward. Through the hands of such as these God speaks, and from behind their eyes He smiles upon the earth.',
    tags: ['Philosophy', 'Calm', 'Inspirational'],
    hue: HUES[2],
    freq: 659.25,
  },
  {
    id: 'phil-20-solzhenitsyn',
    name: '20. Alexander Solzhenitsyn · Live Not by Lies',
    speaker: 'Aleksandr Solzhenitsyn',
    work: 'Nobel Lecture & Manifesto',
    year: '1970 / 1974',
    readingTimeSeconds: 55,
    wordCount: 120,
    inEarPrompt: 'Live not by lies: Violence needs the lie. One word of truth outweighs the whole world.',
    script:
      'Violence can only be concealed by a lie, and the lie can only be maintained by violence. Any man who has once proclaimed violence as his method is inevitably forced to take the lie as his principle.\n\n' +
      'But violence does not and cannot live alone; it is bound up with falsehood. And whoever does not step onto this path of lies, whoever resolves not to live by lies, will disarm violence at its very root.\n\n' +
      'In our age of moral confusion, let us remember the Russian proverb: "One word of truth outweighs the whole world." Upon this apparent paradox rests the strict law of spiritual existence and the invincible power of human conscience.',
    tags: ['Philosophy', 'Rebuttal', 'Confidence'],
    hue: HUES[3],
    freq: 698.46,
  },
];

/**
 * Creates all 20 individual Philosophy Cues with audio tones,
 * scripts formatted with in-ear recitation prompters, and tags.
 */
export async function createPhilosophyDeckCues(): Promise<Cue[]> {
  const cues: Cue[] = [];

  for (let i = 0; i < PHILOSOPHY_20_QUOTES.length; i++) {
    const q = PHILOSOPHY_20_QUOTES[i];
    const blob = await generateBeepBlob(q.freq, 2.0, 'sine', 'prompt');
    const url = URL.createObjectURL(blob);

    const formattedScript =
      `[IN-EAR AUDIO WHISPER (EAR RECITABLE)]\n` +
      `"${q.inEarPrompt}"\n\n` +
      `[FULL VERBATIM RECITATION · ${q.speaker} — ${q.work} (${q.year || ''})]\n` +
      `"${q.script}"\n\n` +
      `[SPEECH PACING & IN-EAR NOTES]\n` +
      `• Word Count: ${q.wordCount} words\n` +
      `• Target Delivery: ~${q.readingTimeSeconds}s (well under 2 min read ceiling)\n` +
      `• Primary Theme: Classical Rhetoric & Monologue Recital`;

    cues.push({
      id: `cue-phil-${i + 1}-${Date.now()}`,
      name: q.name,
      hue: q.hue,
      dur: 2.0,
      target: q.readingTimeSeconds,
      script: formattedScript,
      tags: q.tags,
      blob,
      url,
      isTemplate: true,
      activeTakeIndex: 0,
      primaryLabel: 'Template Chime',
      created: Date.now() - (PHILOSOPHY_20_QUOTES.length - i) * 60000,
    });
  }

  return cues;
}

/**
 * Creates the Master Philosophy Suite Card
 * containing the complete indexed catalogue of the 20 greatest quotes/monologues,
 * designed as an instant prompter card in the main deck under "Philosophy".
 */
export async function createPhilosophyMasterCard(): Promise<Cue> {
  const blob = await generateBeepBlob(523.25, 2.5, 'sine', 'prompt');
  const url = URL.createObjectURL(blob);

  const scriptListing = PHILOSOPHY_20_QUOTES.map(
    (q, idx) =>
      `${idx + 1}. ${q.speaker} — ${q.work} [~${q.readingTimeSeconds}s / ${q.wordCount} words]\n` +
      `   Ear Prompt: "${q.inEarPrompt}"\n` +
      `   Quote: "${q.script.slice(0, 110)}..."`
  ).join('\n\n');

  const fullMasterScript =
    `[PHILOSOPHY · 20 GREATEST SPEECHES & MONOLOGUES SUITE]\n` +
    `Curated for in-ear oral recital, debate anchors, and stage delivery. Each piece is strictly under a 2-minute read.\n\n` +
    `[IN-EAR ANCHOR PROMPTER]\n` +
    `"Speak with composure. Ground your rhetoric in the greatest thinkers of human history."\n\n` +
    `[COMPLETE 20-PIECE RECITABLE CATALOGUE]\n\n` +
    scriptListing;

  return {
    id: `cue-phil-master-${Date.now()}`,
    name: 'Philosophy · 20 Greatest Quotes & Monologues',
    hue: '#c58b4a',
    dur: 2.5,
    target: 120,
    script: fullMasterScript,
    tags: ['Philosophy', 'Inspirational', 'Keynote'],
    isTemplate: true,
    activeTakeIndex: 0,
    primaryLabel: 'Template Suite Tone',
    blob,
    url,
    created: Date.now(),
  };
}

/**
 * Returns a complete DeckSession for the Philosophy deck
 * so it can be saved in local storage / IndexedDB and loaded with 1 tap.
 */
export async function getPhilosophyDeckSession(): Promise<DeckSession> {
  const cues = await createPhilosophyDeckCues();
  return {
    id: 99920,
    name: 'Philosophy: 20 Greatest Speeches & Monologues',
    savedAt: Date.now(),
    cues: cues.map((c) => ({
      id: c.id,
      name: c.name,
      hue: c.hue,
      dur: c.dur,
      target: c.target,
      script: c.script,
      tags: c.tags,
      blob: c.blob || new Blob([], { type: 'audio/wav' }),
      isTemplate: true,
      activeTakeIndex: 0,
      primaryLabel: 'Template Chime',
    })),
  };
}
