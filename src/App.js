import React, { useState, useEffect, useRef } from 'react';
import {
  format,
  parseISO,
  differenceInDays,
  differenceInYears,
  addYears,
  isBefore,
  isAfter,
  startOfDay,
  compareAsc,
} from 'date-fns';
import { FaThumbtack } from 'react-icons/fa';
import './App.css';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const initialData = [
    {
      id: uuidv4(),
      date: '1976-09-18T14:30:00',
      text: 'brady scott lagneaux was born (my brother).',
      pinned: false,
      tags: [],
    },
    {
      id: uuidv4(),
      date: '1980-03-10T09:15:00',
      text: 'blake patrick lagneaux was born (my brother).',
      pinned: false,
      tags: [],
    },
    {
      id: uuidv4(),
      date: '1980-07-07T12:00:00',
      text: 'kelly marie lowe was born.',
      pinned: false,
      tags: [],
    },
    {
      id: uuidv4(),
      date: '1982-08-26T08:45:00',
      text: 'i was born in rayne, louisiana.',
      pinned: false,
      tags: [],
    },
    {
      id: uuidv4(),
      date: '2013-01-26T16:20:00',
      text: 'jason michael lagneaux married kelly marie lowe.',
      pinned: false,
      tags: [],
    },
    {
      id: uuidv4(),
      date: '2014-07-15T10:30:00',
      text: 'august james lagneaux (my first child) was born.',
      pinned: false,
      tags: [],
    },
    {
      id: uuidv4(),
      date: '2016-09-05T14:00:00',
      text: 'evan alexander lagneaux (my second child) was born.',
      pinned: false,
      tags: [],
    },
  ];

  const [originalTimelineData, setOriginalTimelineData] = useState(initialData);
  const [timelineData, setTimelineData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinsOnly, setShowPinsOnly] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    eventId: null,
    tagToDelete: null,
    tagToEdit: null,
    mode: null,
  });
  const [upcomingSortMode, setUpcomingSortMode] = useState('month-day');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [newEventId, setNewEventId] = useState(null);

  const [allTags, setAllTags] = useState([]);
  const [durations, setDurations] = useState({});

  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchableWordsRef = useRef([]);

  const itemRefs = useRef({});

  useEffect(() => {
    updateAllTags(originalTimelineData);
    updateDurations(originalTimelineData);
    updateSearchableWords(originalTimelineData);
  }, [originalTimelineData]);

  const updateAllTags = (data) => {
    const tagsSet = new Set();
    data.forEach((event) => {
      (event.tags || []).forEach((t) => tagsSet.add(t.toLowerCase()));
    });
    setAllTags(Array.from(tagsSet));
  };

  const updateDurations = (data) => {
    const dur = {};
    data.forEach((event) => {
      (event.tags || []).forEach((tag) => {
        const lower = tag.toLowerCase();
        if (lower.startsWith('#start ') || lower.startsWith('#stop ')) {
          const parts = lower.split(' ');
          const name = parts.slice(1).join(' ').trim();
          if (!dur[name]) {
            dur[name] = { start: false, stop: false };
          }
          if (lower.startsWith('#start ')) dur[name].start = true;
          if (lower.startsWith('#stop ')) dur[name].stop = true;
        }
      });
    });
    setDurations(dur);
  };

  const updateSearchableWords = (data) => {
    const wordsSet = new Set();
    data.forEach((event) => {
      event.text.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 1) wordsSet.add(w); });
      (event.tags || []).forEach(tag => { if (tag.length > 1) wordsSet.add(tag.toLowerCase()); });
    });
    searchableWordsRef.current = Array.from(wordsSet);
  };

  const getTimelineDataWithToday = () => {
    const todayDate = new Date();
    const todayEvent = {
      id: 'today',
      date: format(todayDate, "yyyy-MM-dd'T'HH:mm:ss"),
      text: 'today',
      isToday: true,
      tags: [],
    };
    const dataWithToday = [...timelineData, todayEvent];
    dataWithToday.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
    return dataWithToday;
  };

  const timelineDataWithToday = getTimelineDataWithToday();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (newEventId && itemRefs.current[newEventId]) {
      itemRefs.current[newEventId].scrollIntoView({ behavior: 'smooth', block: 'center' });
      setNewEventId(null);
    }
  }, [timelineDataWithToday, newEventId]);

  const filterTimelineData = (data, query, pinsOnly) => {
    if (!query.trim()) {
      return pinsOnly
        ? data.filter((event) => event.pinned && !event.isToday)
        : data.filter((event) => !event.isToday);
    }

    const groups = query
      .split('+')
      .map((group) => group.trim().toLowerCase())
      .filter((group) => group);

    const parsedGroups = groups.map((group) => group.split(' ').filter((term) => term));

    const matchesEvent = (event) => {
      if (event.isToday) return false;
      const formattedDate = format(parseISO(event.date), 'MMMM d, yyyy h:mm a').toLowerCase();
      const textContent = event.text.toLowerCase();
      const tagsContent = (event.tags || []).map((t) => t.toLowerCase());

      return parsedGroups.some((groupTerms) =>
        groupTerms.every(
          (term) =>
            textContent.includes(term) ||
            formattedDate.includes(term) ||
            tagsContent.some((tag) => tag.includes(term))
        )
      );
    };

    if (pinsOnly) {
      return data.filter((event) => event.pinned && matchesEvent(event));
    } else {
      return data
        .filter((event) => matchesEvent(event))
        .concat(
          data.filter((event) => event.pinned && !event.isToday)
        )
        .filter((event, index, self) => self.findIndex((e) => e.id === event.id) === index)
        .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
    }
  };

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = filterTimelineData(originalTimelineData, query, showPinsOnly);
    setTimelineData(filtered);
    updateSearchQuerySuggestions(query);
  };

  const updateSearchQuerySuggestions = (query) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }
    const suggestions = searchableWordsRef.current.filter(w => w.includes(query));
    if (suggestions.length > 0) {
      setSearchSuggestions(suggestions.slice(0, 10));
      setShowSearchSuggestions(true);
    } else {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
    }
  };

  const applySearchSuggestion = (suggestion) => {
    const q = suggestion.toLowerCase();
    setSearchQuery(q);
    const filtered = filterTimelineData(originalTimelineData, q, showPinsOnly);
    setTimelineData(filtered);
    setShowSearchSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    const filtered = filterTimelineData(originalTimelineData, '', showPinsOnly);
    setTimelineData(filtered);
    setSearchSuggestions([]);
    setShowSearchSuggestions(false);
  };

  const toggleShowPinsOnly = () => {
    const newShowPinsOnly = !showPinsOnly;
    setShowPinsOnly(newShowPinsOnly);
    const filtered = filterTimelineData(originalTimelineData, searchQuery, newShowPinsOnly);
    setTimelineData(filtered);
  };

  const toggleUpcomingSortMode = () => {
    setUpcomingSortMode((prevMode) => (prevMode === 'month-day' ? 'absolute' : 'month-day'));
  };

  const handleUpdateEvent = (updatedEvent) => {
    const updatedOriginalData = originalTimelineData.map((event) =>
      event.id === updatedEvent.id
        ? {
            ...event,
            text: updatedEvent.text.toLowerCase(),
            date: updatedEvent.date,
            isNew: false,
            tags: (updatedEvent.tags || []).map(t => t.toLowerCase()),
          }
        : event
    );
    setOriginalTimelineData(updatedOriginalData);
    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);
  };

  const handleTogglePin = (toggledEvent) => {
    const updatedOriginalData = originalTimelineData.map((event) =>
      event.id === toggledEvent.id ? { ...event, pinned: !event.pinned } : event
    );
    setOriginalTimelineData(updatedOriginalData);

    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);
  };

  const handleClearPins = () => {
    const updatedOriginalData = originalTimelineData.map((event) => ({
      ...event,
      pinned: false,
    }));
    setOriginalTimelineData(updatedOriginalData);
    setShowPinsOnly(false);
    const filtered = filterTimelineData(updatedOriginalData, searchQuery, false);
    setTimelineData(filtered);
  };

  const handleAddNewEvent = () => {
    const defaultDate = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    const newEvent = {
      id: uuidv4(),
      date: defaultDate,
      text: '',
      pinned: false,
      isNew: true,
      tags: [],
    };
    const updatedOriginalData = [newEvent, ...originalTimelineData];
    setOriginalTimelineData(updatedOriginalData);

    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);
    setNewEventId(newEvent.id);
  };

  const handleDeleteEvent = (eventId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this event?');
    if (confirmDelete) {
      const updatedOriginalData = originalTimelineData.filter((event) => event.id !== eventId);
      setOriginalTimelineData(updatedOriginalData);
      const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
      setTimelineData(filtered);
    }
  };

  const getUpcomingHistoricalEvents = (count) => {
    const today = startOfDay(new Date());
    const historicalEvents = originalTimelineData.map((event) => {
      const eventDate = parseISO(event.date);
      let anniversary = new Date(
        today.getFullYear(),
        eventDate.getMonth(),
        eventDate.getDate(),
        eventDate.getHours(),
        eventDate.getMinutes(),
        eventDate.getSeconds()
      );
      if (isBefore(anniversary, today)) {
        anniversary = addYears(anniversary, 1);
      }
      const daysUntil = differenceInDays(anniversary, today);
      const years = anniversary.getFullYear() - eventDate.getFullYear();
      return { ...event, anniversary, daysUntil, years };
    });

    return historicalEvents
      .filter((event) => event.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, count);
  };

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  const getFutureEventsWithinSevenDays = (count) => {
    const today = startOfDay(new Date());
    const sevenDaysLater = addDays(today, 7);

    return originalTimelineData
      .filter((event) => {
        const eventDate = parseISO(event.date);
        return isAfter(eventDate, today) && isBefore(eventDate, sevenDaysLater);
      })
      .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)))
      .slice(0, count);
  };

  const upcomingHistoricalEventsList = getUpcomingHistoricalEvents(5);
  const futureEventsWithinSevenDaysList = getFutureEventsWithinSevenDays(5);

  const today = startOfDay(new Date());
  const combinedUpcomingEventsList = [
    ...upcomingHistoricalEventsList,
    ...futureEventsWithinSevenDaysList,
  ]
    .filter((event, index, self) => index === self.findIndex((e) => e.id === event.id))
    .sort((a, b) => {
      if (upcomingSortMode === 'month-day') {
        const aMonthDay = parseISO(a.date);
        const bMonthDay = parseISO(b.date);

        aMonthDay.setFullYear(today.getFullYear());
        bMonthDay.setFullYear(today.getFullYear());

        if (isBefore(aMonthDay, today)) aMonthDay.setFullYear(today.getFullYear() + 1);
        if (isBefore(bMonthDay, today)) bMonthDay.setFullYear(today.getFullYear() + 1);

        return compareAsc(aMonthDay, bMonthDay);
      } else {
        return compareAsc(parseISO(a.date), parseISO(b.date));
      }
    });

  const visibleEvents = timelineData.filter((event) => !event.isToday);
  const totalEvents = visibleEvents.length;
  const sortedByDate = [...visibleEvents].sort((a, b) =>
    compareAsc(parseISO(a.date), parseISO(b.date))
  );
  const firstEventDate = sortedByDate[0] ? parseISO(sortedByDate[0].date) : null;
  const lastEventDate = sortedByDate[sortedByDate.length - 1]
    ? parseISO(sortedByDate[sortedByDate.length - 1].date)
    : null;
  const totalYears =
    firstEventDate && lastEventDate ? differenceInYears(lastEventDate, firstEventDate) : 0;

  const pinnedCount = originalTimelineData.filter((event) => event.pinned).length;
  const hasMultiplePins = pinnedCount >= 2;

  const toggleUpcoming = () => {
    setShowUpcoming((prev) => !prev);
  };

  const handleContextMenu = (e, eventId, tag = null) => {
    e.preventDefault();
    if (!isMobile) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        eventId,
        tagToDelete: tag,
        tagToEdit: null,
        mode: null,
      });
    }
  };

  const handleDeleteTagFromEvent = (eventId, tag) => {
    const updatedOriginalData = originalTimelineData.map((ev) => {
      if (ev.id === eventId) {
        const newTags = (ev.tags || []).filter((t) => t !== tag);
        return { ...ev, tags: newTags };
      }
      return ev;
    });
    setOriginalTimelineData(updatedOriginalData);
    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);
  };

  const handleEditTag = (eventId, tag) => {
    setContextMenu({
      ...contextMenu,
      tagToEdit: { eventId, oldTag: tag },
    });
  };

  const handleTagEdited = (eventId, oldTag, newTag) => {
    newTag = newTag.toLowerCase();
    const updatedOriginalData = originalTimelineData.map((ev) => {
      if (ev.id === eventId) {
        const newTags = (ev.tags || []).map((t) => (t === oldTag ? newTag : t));
        return { ...ev, tags: newTags };
      }
      return ev;
    });
    setOriginalTimelineData(updatedOriginalData);
    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);
  };

  // No separators, center aligned upcoming lines, lines may wrap:
  let upcomingLines = [];
  for (let i = 0; i < combinedUpcomingEventsList.length; i++) {
    const event = combinedUpcomingEventsList[i];
    const displayText = `${format(parseISO(event.date), 'MMMM d')} - ${event.text}${
      event.years ? ` (In ${event.daysUntil} days it will be ${event.years} years)` : ''
    }`;
    upcomingLines.push(displayText);
  }

  return (
    <div className="container">
      <header className="header-row">
        <h1>ContexTime</h1>
        <div id="current-datetime">{format(currentDateTime, 'MMMM d, yyyy h:mm:ss a')}</div>
        {firstEventDate && lastEventDate && (
          <div id="stats-section">
            <p>
              {`${totalEvents} events spanning ${totalYears} years (${
                firstEventDate ? format(firstEventDate, 'MMMM d, yyyy') : ''
              } - ${
                lastEventDate ? format(lastEventDate, 'MMMM d, yyyy') : ''
              })`}
            </p>
            <div
              className="more-info"
              onClick={() => setShowInfoModal(true)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowInfoModal(true);
                }
              }}
            >
              More info
            </div>
          </div>
        )}
      </header>

      {showInfoModal && (
        <div className="info-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()} style={{position:'relative', overflowY:'auto', maxHeight:'80vh'}}>
            <div style={{position:'sticky', top:0, background:'var(--bg-primary)', padding:'0.5rem', display:'flex', justifyContent:'flex-end'}}>
              <button className="close-modal-button" onClick={() => setShowInfoModal(false)}>
                Close
              </button>
            </div>
            <h2>More info</h2>
            <p><strong>Current date-time:</strong><br/>
              Shows the live date and time based on your browser.  
            </p>
            <p><strong>Overall stats line:</strong><br/>
              Shows a summary of the number of events recorded and the duration in time they cover.  
            </p>
            <p><strong>Upcoming:</strong><br/>
              Click "Upcoming" to expand/collapse visibility of recurring historical or future events (up to 5 of each).  The user may sort based on month-day (ignores year) or absolute chronological order (old to new).  Events for today do not show.  
            </p>
            <p><strong>Create & edit timeline events:</strong><br/>
              Click the plus sign to create a new timeline event and the page will auto scroll to the current time position in the timeline.  The new timeline event defaults to the current time or you can edit with the date-time picker to record historical or future events.  Text descriptions are required to create an event.  
            </p>
            <p><strong>Tags:</strong><br/>
              Add tags while editing an event. After adding or picking a tag name, click outside the tag edit text area to save the tag.  More than one tag can be created per event. A second click outside of the timeline event saves the event. 
            </p><p><strong>Speical tags:</strong><br/>
            #start duration_name and #stop duration_name are used to tag the start and stop of a duration, and @name is used to tag people or groups. Normal tags are for everything else but cannot contain '#' or '@'. To edit or delete a tag, right-click (desktop) or long-press (mobile). 
            </p>
            <p><strong>Duration details:</strong><br/>
              You can't have both #start duration_name and #stop duration_name on the same event.  You can't have a #stop duration_name before a #start duration_name in time.  
            </p>
            <p><strong>Search box:</strong><br/>
              Use '+' to OR groups of search terms.  Spaces between text from timeline event descriptions, dates, or tags will AND terms together in groups.  Search to find events then pin for review.
            </p>
            <p><strong>Pinned events:</strong><br/>
              Pin events to keep them visible. Toggle by clicking after hover (desktop) or long-press (mobile).  Search and pin events to create a custom timeline view of events in chronologocal order.  
            </p>
          </div>
        </div>
      )}

      <div className="upcoming-section">
        <h2
          className="toggle-upcoming"
          onClick={toggleUpcoming}
          role="button"
          aria-expanded={showUpcoming}
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              toggleUpcoming();
            }
          }}
        >
          Upcoming
        </h2>
        {showUpcoming && (
          <>
            <div className="sort-toggle">
              <span>Sort by: </span>
              <button onClick={toggleUpcomingSortMode} className="sort-button">
                {upcomingSortMode === 'month-day' ? 'Month-Day' : 'Absolute Chronological'}
              </button>
            </div>
            {upcomingLines.map((line, i) => (
              <div key={i} className="upcoming-line" style={{textAlign:'center', whiteSpace:'normal', overflow:'visible'}}>
                {line}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="row center">
        <div className="form-group">
          <div id="search-box-container">
            <input
              type="text"
              id="search"
              className="search-input"
              placeholder="Search timeline events here..."
              value={searchQuery}
              onFocus={() => showSearchSuggestions && searchSuggestions.length > 0 && setShowSearchSuggestions(true)}
              onChange={handleSearchChange}
              onBlur={() => setShowSearchSuggestions(false)}
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={clearSearch}
                title="Clear Search"
                aria-label="Clear Search"
              >
                ✖
              </button>
            )}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="search-suggestions">
                {searchSuggestions.map((s) => (
                  <div
                    key={s}
                    className="search-suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySearchSuggestion(s);
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="mobile-instruction">
          Long press events to toggle pins or delete tags & events
        </div>
      )}

      <div id="timeline-section">
        <div className="timeline-controls">
          <div className="add-event-text" onClick={handleAddNewEvent} title="Add New Event">
            +
          </div>
          <div className="right-controls">
            {hasMultiplePins && (
              <div
                className="show-pins-only"
                onClick={toggleShowPinsOnly}
                title={showPinsOnly ? 'Show All Events' : 'Show Pins Only'}
              >
                {showPinsOnly ? 'Show All' : 'Show Pins Only'}
              </div>
            )}
            {hasMultiplePins && (
              <div className="clear-pins" onClick={handleClearPins} title="Clear All Pins">
                Clear Pins
              </div>
            )}
          </div>
        </div>
        <div className="timeline" id="vertical-timeline">
          <div className="timeline-label history-label">History begins...</div>
          {timelineDataWithToday.map((event, index) => {
            const eventDate = parseISO(event.date);
            const now = new Date();
            const isFutureEvent = isAfter(eventDate, startOfDay(now));
            let items = [];

            // Put the event first
            items.push(
              <TimelineItem
                key={event.id}
                event={event}
                onUpdateEvent={handleUpdateEvent}
                onTogglePin={handleTogglePin}
                onDeleteEvent={handleDeleteEvent}
                onContextMenu={handleContextMenu}
                onDeleteTag={handleDeleteTagFromEvent}
                onEditTag={handleEditTag}
                onTagEdited={handleTagEdited}
                isMobile={isMobile}
                allTags={allTags}
                durations={durations}
                ref={(el) => (itemRefs.current[event.id] = el)}
              />
            );

            // If current event is future and previous event was past, add label AFTER this event
            if (isFutureEvent && index > 0) {
              const prevEventDate = parseISO(timelineDataWithToday[index - 1].date);
              const wasPastEvent = isBefore(prevEventDate, startOfDay(now));
              if (wasPastEvent) {
                items.push(
                  <div className="timeline-label future-label" key={`future-label-${event.id}`}>
                    To the future...
                  </div>
                );
              }
            }

            return items;
          })}
        </div>
      </div>

      {!isMobile && contextMenu.visible && contextMenu.mode === null && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {(() => {
            const ev = originalTimelineData.find(e => e.id === contextMenu.eventId);
            if (!ev) {
              return (
                <div
                  className="context-menu-item"
                  onClick={() => setContextMenu({ ...contextMenu, visible: false })}
                >
                  No Event Found
                </div>
              );
            }
            const eventTags = ev.tags || [];
            return (
              <>
                <div
                  className="context-menu-item"
                  onClick={() => {
                    handleDeleteEvent(contextMenu.eventId);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                >
                  Delete
                </div>
                {eventTags.length > 0 && (
                  <div
                    className="context-menu-item"
                    onClick={() => {
                      setContextMenu({ ...contextMenu, mode: 'chooseTagToDelete' });
                    }}
                  >
                    Delete Tag
                  </div>
                )}
                <div
                  className="context-menu-item"
                  onClick={() => {
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                >
                  Cancel
                </div>
              </>
            );
          })()}
        </div>
      )}

      {!isMobile && contextMenu.visible && contextMenu.mode === 'chooseTagToDelete' && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {(() => {
            const ev = originalTimelineData.find(e => e.id === contextMenu.eventId);
            if (!ev || (ev.tags || []).length === 0) {
              return (
                <div
                  className="context-menu-item"
                  onClick={() => setContextMenu({ ...contextMenu, visible: false, mode: null })}
                >
                  No Tags to Delete
                </div>
              );
            }
            return (
              <>
                {ev.tags.map(tag => (
                  <div
                    key={tag}
                    className="context-menu-item"
                    onClick={() => {
                      const confirmDelete = window.confirm(`Are you sure you want to delete the tag "${tag}"?`);
                      if (confirmDelete) {
                        handleDeleteTagFromEvent(contextMenu.eventId, tag);
                      }
                      setContextMenu({ ...contextMenu, visible: false, mode: null });
                    }}
                  >
                    Delete "{tag}"
                  </div>
                ))}
                <div
                  className="context-menu-item"
                  onClick={() => setContextMenu({ ...contextMenu, visible: false, mode: null })}
                >
                  Cancel
                </div>
              </>
            );
          })()}
        </div>
      )}

      {isMobile && contextMenu.visible && contextMenu.mode === null && (
        <div
          className="mobile-options-modal"
          style={{overflowY:'auto',maxHeight:'80vh'}}
        >
          {(() => {
            const ev = originalTimelineData.find(e => e.id === contextMenu.eventId);
            if (!ev) {
              return (
                <button onClick={() => setContextMenu({ ...contextMenu, visible: false })} className="option-button">
                  No Event Found
                </button>
              );
            }
            const eventTags = ev.tags || [];
            return (
              <>
                <button onClick={() => {
                  handleDeleteEvent(contextMenu.eventId);
                  setContextMenu({ ...contextMenu, visible: false });
                }} className="option-button">
                  Delete
                </button>
                {eventTags.length > 0 && (
                  <button onClick={() => {
                    setContextMenu({ ...contextMenu, mode: 'chooseTagToDelete', visible: true });
                  }} className="option-button">
                    Delete Tag
                  </button>
                )}
                <button
                  onClick={() => setContextMenu({ ...contextMenu, visible: false })}
                  className="option-button cancel-button"
                >
                  Cancel
                </button>
              </>
            );
          })()}
        </div>
      )}

      {isMobile && contextMenu.visible && contextMenu.mode === 'chooseTagToDelete' && (
        <div className="mobile-options-modal" style={{overflowY:'auto',maxHeight:'80vh'}}>
          {(() => {
            const ev = originalTimelineData.find(e => e.id === contextMenu.eventId);
            const eventTags = ev ? ev.tags || [] : [];
            if (!ev || eventTags.length === 0) {
              return (
                <button
                  onClick={() => {
                    setContextMenu({ ...contextMenu, visible: false, mode: null });
                  }}
                  className="option-button"
                >
                  No Tags to Delete
                </button>
              );
            }
            return (
              <>
                {eventTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      const confirmDelete = window.confirm(`Are you sure you want to delete the tag "${tag}"?`);
                      if (confirmDelete) {
                        handleDeleteTagFromEvent(contextMenu.eventId, tag);
                      }
                      setContextMenu({ ...contextMenu, visible: false, mode: null });
                    }}
                    className="option-button"
                  >
                    Delete "{tag}"
                  </button>
                ))}
                <button
                  onClick={() => {
                    setContextMenu({ ...contextMenu, visible: false, mode: null });
                  }}
                  className="option-button cancel-button"
                >
                  Cancel
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

const TimelineItem = React.forwardRef(function TimelineItem(
  { event, onUpdateEvent, onTogglePin, onDeleteEvent, onContextMenu, onDeleteTag, onEditTag, onTagEdited, isMobile, allTags, durations },
  ref
) {
  const [isEditing, setIsEditing] = useState(event.isNew || false);
  const [editedText, setEditedText] = useState(event.text.toLowerCase());
  const [editedDate, setEditedDate] = useState(formatDateForInput(event.date));
  const [editedTags, setEditedTags] = useState((event.tags || []).map(t => t.toLowerCase()));
  const [isHovered, setIsHovered] = useState(false);

  const editRef = useRef(null);
  const textAreaRef = useRef(null);
  const touchTimeout = useRef(null);

  const [showOptions, setShowOptions] = useState(false);
  const [showTagDeleteMenu, setShowTagDeleteMenu] = useState(false);

  const [newTagInput, setNewTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [tagBeingEdited, setTagBeingEdited] = useState(null);
  const [tagEditInput, setTagEditInput] = useState('');
  const [tagsFinalized, setTagsFinalized] = useState(false);

  useEffect(() => {
    const handleClickOutside = (eventOutside) => {
      if (editRef.current && !editRef.current.contains(eventOutside.target)) {
        if (isEditing) {
          if (!tagsFinalized) {
            finalizeTagInput();
            setTagsFinalized(true);
          } else {
            handleSave();
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editedText, editedDate, editedTags, newTagInput, tagBeingEdited, tagEditInput, tagsFinalized]);

  useEffect(() => {
    if (isEditing) {
      setTagsFinalized(false);
    }
  }, [isEditing]);

  useEffect(() => {
    updateTagSuggestions();
  }, [newTagInput, allTags, editedTags, durations, tagBeingEdited, tagEditInput]);

  const finalizeTagInput = () => {
    if (newTagInput.trim()) {
      handleAddTag(newTagInput.trim());
      setNewTagInput('');
    }
    if (tagBeingEdited && tagEditInput.trim()) {
      handleFinishTagEdit();
    }
  };

  const updateTagSuggestions = () => {
    let query;
    if (tagBeingEdited) {
      query = tagEditInput.trim().toLowerCase();
    } else {
      query = newTagInput.trim().toLowerCase();
    }

    if (!query) {
      setTagSuggestions([]);
      return;
    }
    const suggestions = getAllTagSuggestions(query);
    setTagSuggestions(suggestions);
  };

  const getAllTagSuggestions = (query) => {
    const normalSuggestions = allTags.filter(
      (t) => t.includes(query) && !editedTags.includes(t)
    );

    let durationSuggestions = [];
    if (query.startsWith('#start ') || query.startsWith('#stop ')) {
      const prefix = query.startsWith('#start ') ? '#start ' : '#stop ';
      const namePart = query.slice(prefix.length).trim();
      durationSuggestions = Object.keys(durations).filter(dName => {
        const d = durations[dName];
        return (!d || (d && !(d.start && d.stop))) && dName.includes(namePart);
      }).map(dName => prefix + dName);
    }

    const allSugs = [...normalSuggestions, ...durationSuggestions];
    return allSugs.slice(0, 10);
  };

  const handleSave = () => {
    if (!editedText.trim()) {
      alert('Event text cannot be empty.');
      return;
    }
    const parsedDate = new Date(editedDate);
    if (isNaN(parsedDate.getTime())) {
      alert('Invalid date format. Please enter a valid date and time.');
      return;
    }

    onUpdateEvent({
      ...event,
      text: editedText.toLowerCase(),
      date: format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss"),
      tags: editedTags.map(t => t.toLowerCase()),
    });
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (tagBeingEdited) {
        handleFinishTagEdit();
      } else if (newTagInput.trim()) {
        handleAddTag(newTagInput.trim());
        setNewTagInput('');
      } else {
        if (!tagsFinalized) {
          finalizeTagInput();
          setTagsFinalized(true);
        } else {
          handleSave();
        }
      }
    }
  };

  const handleAddTag = (tag) => {
    tag = tag.toLowerCase();
    if (tag.startsWith('#') && !(tag.startsWith('#start ') || tag.startsWith('#stop '))) {
      alert('Invalid special tag. Only "#start name" or "#stop name" allowed when using "#".');
      return;
    }
    if (tag.startsWith('@')) {
      if (tag.length <= 1) {
        alert('Invalid person tag. Must be "@name".');
        return;
      }
    }
    if (!tag.startsWith('#') && !tag.startsWith('@')) {
      if (tag.includes('@') || tag.includes('#')) {
        alert('Normal tags cannot contain # or @ symbols.');
        return;
      }
    }

    const hasStartOrStop = editedTags.some(t => t.startsWith('#start ') || t.startsWith('#stop '));
    if ((tag.startsWith('#start ') || tag.startsWith('#stop ')) && hasStartOrStop) {
      alert('Cannot have both #start and #stop tags on the same event.');
      return;
    }

    if (!editedTags.includes(tag)) {
      if (tagBeingEdited) {
        const oldTag = tagBeingEdited.oldTag;
        const updated = editedTags.map(t => t === oldTag ? tag : t);
        setEditedTags(updated);
        setTagBeingEdited(null);
        setTagEditInput('');
      } else {
        setEditedTags([...editedTags, tag]);
      }
    }
  };

  const startTagEdit = (oldTag) => {
    setTagBeingEdited({ oldTag });
    setTagEditInput(oldTag);
  };

  const handleFinishTagEdit = () => {
    const newTagName = tagEditInput.trim().toLowerCase();
    if (!newTagName) {
      setTagBeingEdited(null);
      setTagEditInput('');
      return;
    }
    handleAddTag(newTagName);
  };

  const classForTag = (tag) => {
    const lower = tag.toLowerCase();
    if (lower.startsWith('@')) {
      return 'tag tag-person';
    }
    if (lower.startsWith('#start ') || lower.startsWith('#stop ')) {
      return 'tag tag-range';
    }
    return 'tag';
  };

  const eventTags = editedTags;

  const tagContextMenu = (e, tag) => {
    onContextMenu(e, event.id, tag);
  };

  const handleTouchStart = () => {
    touchTimeout.current = setTimeout(() => {
      setShowOptions(true);
    }, 700);
  };

  const handleTouchEnd = () => {
    clearTimeout(touchTimeout.current);
  };

  const handleOptionSelect = (option) => {
    if (option === 'pin') {
      onTogglePin(event);
    } else if (option === 'delete') {
      onDeleteEvent(event.id);
    }
    setShowOptions(false);
  };

  return (
    <div
      className="timeline-item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => onContextMenu(e, event.id)}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
      ref={ref}
    >
      <div className="timeline-marker"></div>
      <div
        className="timeline-content"
        ref={editRef}
        onClick={() => {
          if (!event.isToday && !tagBeingEdited) {
            setIsEditing(true);
          }
        }}
      >
        {isEditing ? (
          <div className="edit-container">
            <input
              type="datetime-local"
              className="timeline-date-edit"
              value={editedDate}
              onChange={(e) => setEditedDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyPress={handleKeyPress}
              onBlur={() => {
                if (!editedText.trim() && textAreaRef.current) {
                  textAreaRef.current.focus();
                }
              }}
              min="1900-01-01T00:00"
              max="2100-12-31T23:59"
            />
            <textarea
              className="timeline-text-edit"
              ref={textAreaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value.toLowerCase())}
              onClick={(e) => e.stopPropagation()}
              onKeyPress={handleKeyPress}
            />
            <div className="tags-edit-section">
              <div className="tags-list">
                {editedTags.map((tag) =>
                  tagBeingEdited && tagBeingEdited.oldTag === tag ? (
                    <input
                      key={tag}
                      className="tag-input editing"
                      value={tagEditInput}
                      onChange={(e) => setTagEditInput(e.target.value.toLowerCase())}
                      onKeyPress={handleKeyPress}
                      onBlur={finalizeTagInput}
                    />
                  ) : (
                    <span
                      className={classForTag(tag)}
                      key={tag}
                      onContextMenu={(ev) => tagContextMenu(ev, tag)}
                      onTouchStart={
                        isMobile
                          ? (evt) => {
                              const { clientX, clientY } = evt.touches && evt.touches[0] ? evt.touches[0] : evt;
                              const fakeEvent = {
                                preventDefault: () => {},
                                clientX,
                                clientY
                              };
                              touchTimeout.current = setTimeout(() => {
                                onContextMenu(fakeEvent, event.id, tag);
                              }, 700);
                            }
                          : undefined
                      }
                      onTouchEnd={isMobile ? () => clearTimeout(touchTimeout.current) : undefined}
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
              {!tagBeingEdited && (
                <div className="tag-input-container">
                  <input
                    type="text"
                    className="tag-input"
                    placeholder="Add tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value.toLowerCase())}
                    onKeyPress={handleKeyPress}
                    onBlur={finalizeTagInput}
                  />
                  {tagSuggestions.length > 0 && (
                    <div className="tag-suggestions">
                      {tagSuggestions.map((s) => (
                        <div
                          className="tag-suggestion-item"
                          key={s}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            handleAddTag(s);
                            setNewTagInput('');
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="timeline-date">
              {format(parseISO(event.date), 'MMMM d, yyyy h:mm a')}
            </div>
            <div className="timeline-text">{event.text}</div>
            <div className="tags-display">
              {event.tags?.map((tag) => (
                <span
                  key={tag}
                  className={classForTag(tag)}
                  onContextMenu={(e) => tagContextMenu(e, tag)}
                  onTouchStart={
                    isMobile
                      ? (evt) => {
                          const { clientX, clientY } = evt.touches && evt.touches[0] ? evt.touches[0] : evt;
                          const fakeEvent = {
                            preventDefault: () => {},
                            clientX,
                            clientY
                          };
                          touchTimeout.current = setTimeout(() => {
                            onContextMenu(fakeEvent, event.id, tag);
                          }, 700);
                        }
                      : undefined
                  }
                  onTouchEnd={isMobile ? () => clearTimeout(touchTimeout.current) : undefined}
                >
                  {tag}
                </span>
              ))}
            </div>
          </>
        )}

        {!isEditing && (isHovered || event.pinned) && (
          <div className="timeline-actions">
            <button
              className="pin-button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(event);
              }}
              aria-label={event.pinned ? 'Unpin Event' : 'Pin Event'}
              title={event.pinned ? 'Unpin Event' : 'Pin Event'}
            >
              <FaThumbtack color="#000000" />
            </button>
          </div>
        )}
      </div>

      {isMobile && showOptions && !showTagDeleteMenu && (
        <div className="mobile-options-modal" style={{overflowY:'auto',maxHeight:'80vh'}}>
          <>
            <button onClick={() => handleOptionSelect('pin')} className="option-button">
              {event.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={() => handleOptionSelect('delete')} className="option-button">
              Delete
            </button>
            {eventTags.length > 0 && (
              <button onClick={() => {
                setShowTagDeleteMenu(true);
                setShowOptions(false);
              }} className="option-button">
                Delete Tag
              </button>
            )}
            <button
              onClick={() => setShowOptions(false)}
              className="option-button cancel-button"
            >
              Cancel
            </button>
          </>
        </div>
      )}

      {isMobile && showTagDeleteMenu && (
        <div className="mobile-options-modal" style={{overflowY:'auto',maxHeight:'80vh'}}>
          {eventTags.length === 0 ? (
            <button
              onClick={() => {
                setShowTagDeleteMenu(false);
              }}
              className="option-button"
            >
              No Tags to Delete
            </button>
          ) : (
            <>
              {eventTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    const confirmDelete = window.confirm(`Are you sure you want to delete the tag "${tag}"?`);
                    if (confirmDelete) {
                      onDeleteTag(event.id, tag);
                    }
                    setShowTagDeleteMenu(false);
                  }}
                  className="option-button"
                >
                  Delete "{tag}"
                </button>
              ))}
              <button
                onClick={() => {
                  setShowTagDeleteMenu(false);
                }}
                className="option-button cancel-button"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

function formatDateForInput(dateString) {
  const date = parseISO(dateString);
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60000);
  return adjustedDate.toISOString().slice(0, 16);
}

export default App;