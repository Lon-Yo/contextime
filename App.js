// src/App.js
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
  // Initial Timeline Data
  const initialData = [
    {
      id: uuidv4(),
      date: '1976-09-18T14:30:00',
      text: 'Brady Scott Lagneaux was born (my brother).',
      pinned: false,
    },
    {
      id: uuidv4(),
      date: '1980-03-10T09:15:00',
      text: 'Blake Patrick Lagneaux was born (my brother).',
      pinned: false,
    },
    {
      id: uuidv4(),
      date: '1980-07-07T12:00:00',
      text: 'Kelly Marie Lowe was born.',
      pinned: false,
    },
    {
      id: uuidv4(),
      date: '1982-08-26T08:45:00',
      text: 'I was born in Rayne, Louisiana.',
      pinned: false,
    },
    {
      id: uuidv4(),
      date: '2013-01-26T16:20:00',
      text: 'Jason Michael Lagneaux married Kelly Marie Lowe.',
      pinned: false,
    },
    {
      id: uuidv4(),
      date: '2014-07-15T10:30:00',
      text: 'August James Lagneaux (my first child) was born.',
      pinned: false,
    },
    {
      id: uuidv4(),
      date: '2016-09-05T14:00:00',
      text: 'Evan Alexander Lagneaux (my second child) was born.',
      pinned: false,
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
  });
  const [upcomingSortMode, setUpcomingSortMode] = useState('month-day');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [newEventId, setNewEventId] = useState(null); // New state variable

  // Ref object to store refs of timeline items
  const itemRefs = useRef({});

  // Include today event
  const getTimelineDataWithToday = () => {
    const todayDate = new Date();
    const todayEvent = {
      id: 'today',
      date: format(todayDate, "yyyy-MM-dd'T'HH:mm:ss"),
      text: 'Today',
      isToday: true,
    };
    const dataWithToday = [...timelineData, todayEvent];
    dataWithToday.sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
    return dataWithToday;
  };

  const timelineDataWithToday = getTimelineDataWithToday();

  // Update current date and time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to the newly added event
  useEffect(() => {
    if (newEventId && itemRefs.current[newEventId]) {
      itemRefs.current[newEventId].scrollIntoView({ behavior: 'smooth', block: 'center' });
      setNewEventId(null);
    }
  }, [timelineDataWithToday, newEventId]);

  // Function to filter timeline data
  const filterTimelineData = (data, query, pinsOnly) => {
    if (!query.trim()) {
      return pinsOnly
        ? data.filter((event) => event.pinned && !event.isToday)
        : data.filter((event) => !event.isToday);
    }

    // Split the query into groups separated by '+'
    const groups = query
      .split('+')
      .map((group) => group.trim().toLowerCase())
      .filter((group) => group);

    // Each group contains terms separated by spaces (AND)
    const parsedGroups = groups.map((group) => group.split(' ').filter((term) => term));

    if (pinsOnly) {
      // Show only pinned items matching any of the groups
      return data.filter((event) => {
        if (!event.pinned || event.isToday) return false;
        const formattedDate = format(parseISO(event.date), 'MMMM d, yyyy h:mm a').toLowerCase();
        // Check if event matches any group
        return parsedGroups.some((groupTerms) =>
          groupTerms.every(
            (term) =>
              event.text.toLowerCase().includes(term) || formattedDate.includes(term)
          )
        );
      });
    } else {
      // Show all items based on search query
      return data
        .filter((event) => {
          if (event.isToday) return false;
          const formattedDate = format(parseISO(event.date), 'MMMM d, yyyy h:mm a').toLowerCase();
          // Check if event matches any group
          return parsedGroups.some((groupTerms) =>
            groupTerms.every(
              (term) =>
                event.text.toLowerCase().includes(term) || formattedDate.includes(term)
            )
          );
        })
        .concat(
          // Additionally include pinned events that may not match the search but are pinned
          data.filter((event) => event.pinned && !event.isToday)
        )
        .filter(
          (event, index, self) => self.findIndex((e) => e.id === event.id) === index
        )
        .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));
    }
  };

  // Handle search input
  const handleSearch = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    const filtered = filterTimelineData(originalTimelineData, query, showPinsOnly);
    setTimelineData(filtered);
  };

  // Clear search input
  const clearSearch = () => {
    setSearchQuery('');
    const filtered = filterTimelineData(originalTimelineData, '', showPinsOnly);
    setTimelineData(filtered);
  };

  // Toggle "Show Pins Only" state
  const toggleShowPinsOnly = () => {
    const newShowPinsOnly = !showPinsOnly;
    setShowPinsOnly(newShowPinsOnly);
    const filtered = filterTimelineData(
      originalTimelineData,
      searchQuery,
      newShowPinsOnly
    );
    setTimelineData(filtered);
  };

  // Toggle Sorting Mode
  const toggleUpcomingSortMode = () => {
    setUpcomingSortMode((prevMode) => (prevMode === 'month-day' ? 'absolute' : 'month-day'));
  };

  // Update event details
  const handleUpdateEvent = (updatedEvent) => {
    const updatedOriginalData = originalTimelineData.map((event) =>
      event.id === updatedEvent.id
        ? { ...event, text: updatedEvent.text, date: updatedEvent.date, isNew: false }
        : event
    );
    setOriginalTimelineData(updatedOriginalData);

    // Re-apply filter with updated data and current search query & showPinsOnly
    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);
  };

  // Toggle pin state
  const handleTogglePin = (toggledEvent) => {
    const updatedOriginalData = originalTimelineData.map((event) =>
      event.id === toggledEvent.id ? { ...event, pinned: !event.pinned } : event
    );
    setOriginalTimelineData(updatedOriginalData);

    // Re-apply filter with updated data and current search query & showPinsOnly
    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);
  };

  // Clear all pins
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

  // Add a new event
  const handleAddNewEvent = () => {
    const defaultDate = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    const newEvent = {
      id: uuidv4(),
      date: defaultDate,
      text: '',
      pinned: false,
      isNew: true,
    };
    const updatedOriginalData = [newEvent, ...originalTimelineData];
    setOriginalTimelineData(updatedOriginalData);

    // Re-apply filter
    const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
    setTimelineData(filtered);

    // Set the new event ID to scroll into view
    setNewEventId(newEvent.id);
  };

  // Handle deletion of an event
  const handleDeleteEvent = (eventId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this event?');
    if (confirmDelete) {
      const updatedOriginalData = originalTimelineData.filter((event) => event.id !== eventId);
      setOriginalTimelineData(updatedOriginalData);
      const filtered = filterTimelineData(updatedOriginalData, searchQuery, showPinsOnly);
      setTimelineData(filtered);
    }
  };

  // Function to get the next upcoming historical events
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

  // Function to get future events within the next seven days
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

  // Retrieve both lists
  const upcomingHistoricalEventsList = getUpcomingHistoricalEvents(5);
  const futureEventsWithinSevenDaysList = getFutureEventsWithinSevenDays(5);

  // Combine both lists
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

  // Calculate stats
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

  // Count of pinned items
  const pinnedCount = originalTimelineData.filter((event) => event.pinned).length;
  const hasMultiplePins = pinnedCount >= 2;

  // Toggle function for Upcoming section
  const toggleUpcoming = () => {
    setShowUpcoming((prev) => !prev);
  };

  // Handle right-click (context menu) on timeline items
  const handleContextMenu = (event, eventId) => {
    event.preventDefault();
    if (!isMobile) {
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        eventId: eventId,
      });
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleClick);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleClick);
    };
  }, [contextMenu]);

  return (
    <div className="container">
      <header className="header-row">
        <h1>ContexTime</h1>
        <div id="current-datetime">{format(currentDateTime, 'MMMM d, yyyy h:mm:ss a')}</div>
        {firstEventDate && lastEventDate && (
          <div id="stats-section">
            <p>
              {`${totalEvents} events spanning ${totalYears} years from ${format(
                firstEventDate,
                'MMMM d, yyyy'
              )} to ${format(lastEventDate, 'MMMM d, yyyy')}`}
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

      {/* Info Modal */}
      {showInfoModal && (
        <div className="info-modal-overlay" onClick={() => setShowInfoModal(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <h2>About This Timeline</h2>
            <p>
              <strong>Upcoming Section:</strong> This section is initially hidden; click on
              "Upcoming" to reveal it. It displays up to five upcoming anniversaries of past
              events and up to five future events occurring within the next seven days. Events
              are sorted either by their upcoming date (month and day) or by their absolute
              chronological order, depending on your selection.
            </p>
            <p>
              Clicking on a line in the Upcoming section pins the event to your timeline (see
              Pinned Events).
            </p>
            <p>
              <strong>Editing Events:</strong> You can edit any timeline event by clicking on
              it. After making changes, click outside the event to save. To delete an event,
              right-click on it and select "Delete" (on desktop), or long-press and select
              "Delete" (on mobile).
            </p>
            <p>
              <strong>Advanced Search:</strong> Use the search box to filter events. You can
              use '+' to separate groups and OR them together. For example, 'birthday +
              wedding' will show events that are either birthdays or weddings. Within each
              group, spaces between terms act as AND conditions. For example, 'birthday
              family' will show events that include both 'birthday' and 'family'. Combining
              these, 'birthday family + wedding' will show events that are either weddings or
              events that include both 'birthday' and 'family'.
            </p>
            <p>
              <strong>Pinned Events:</strong> You can pin important events by clicking the
              thumbtack icon (on desktop) or by long-pressing an event and selecting 'Pin' (on
              mobile). Pinned events remain visible even when they don't match the current
              search criteria.
            </p>
            <button className="close-modal-button" onClick={() => setShowInfoModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Events Section */}
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
            {/* Toggle Sorting Mode Link */}
            <div className="sort-toggle">
              <span>Sort by: </span>
              <button onClick={toggleUpcomingSortMode} className="sort-button">
                {upcomingSortMode === 'month-day' ? 'Month-Day' : 'Absolute Chronological'}
              </button>
            </div>

            {/* Upcoming List with Separators */}
            <ul className="upcoming-list">
              {combinedUpcomingEventsList.map((event, index) => (
                <React.Fragment key={`upcoming-${event.id}`}>
                  <li onClick={() => handleTogglePin(event)}>
                    {format(parseISO(event.date), 'MMMM d')} - {event.text}{' '}
                    {event.years
                      ? `(In ${event.daysUntil} days it will be ${event.years} years)`
                      : ''}
                  </li>
                  {/* Add separator except after the last item */}
                  {index < combinedUpcomingEventsList.length - 1 && (
                    <li className="separator">*</li>
                  )}
                </React.Fragment>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Search Events */}
      <div className="row center">
        <div className="form-group">
          <div id="search-box-container">
            <input
              type="text"
              id="search"
              className="search-input"
              placeholder="Search timeline events here..."
              value={searchQuery}
              onChange={handleSearch}
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
          </div>
        </div>
      </div>

      {/* Instruction Text for Mobile */}
      {isMobile && (
        <div className="mobile-instruction">
          Long press to pin or delete timeline event
        </div>
      )}

      {/* Timeline Section */}
      <div id="timeline-section">
        <div className="timeline-controls">
          <div className="add-event-text" onClick={handleAddNewEvent} title="Add New Event">
            +
          </div>
          {/* Grouped Links Container */}
          <div className="right-controls">
            {/* Conditionally Render "Show Pins Only" / "Show All" Toggle */}
            {hasMultiplePins && (
              <div
                className="show-pins-only"
                onClick={toggleShowPinsOnly}
                title={showPinsOnly ? 'Show All Events' : 'Show Pins Only'}
              >
                {showPinsOnly ? 'Show All' : 'Show Pins Only'}
              </div>
            )}
            {/* Conditionally Render "Clear Pins" Link */}
            {hasMultiplePins && (
              <div className="clear-pins" onClick={handleClearPins} title="Clear All Pins">
                Clear Pins
              </div>
            )}
          </div>
        </div>
        <div className="timeline" id="vertical-timeline">
          {/* Insert "History starts here" at the beginning */}
          <div className="timeline-label history-label">History starts here</div>
          {timelineDataWithToday.map((event, index) => {
            // Determine if we need to insert "Into the future" label
            const eventDate = parseISO(event.date);
            const now = new Date();
            const isFutureEvent = isAfter(eventDate, startOfDay(now));
            let items = [];

            // Insert "Into the future" label before the first future event
            if (isFutureEvent && index > 0) {
              const prevEventDate = parseISO(timelineDataWithToday[index - 1].date);
              const wasPastEvent = isBefore(prevEventDate, startOfDay(now));
              if (wasPastEvent) {
                items.push(
                  <div className="timeline-label future-label" key="future-label">
                    Into the future
                  </div>
                );
              }
            }

            items.push(
              <TimelineItem
                key={event.id}
                event={event}
                onUpdateEvent={handleUpdateEvent}
                onTogglePin={handleTogglePin}
                onDeleteEvent={handleDeleteEvent}
                onContextMenu={handleContextMenu}
                isMobile={isMobile}
                ref={(el) => (itemRefs.current[event.id] = el)} // Assign ref
              />
            );

            return items;
          })}
        </div>
      </div>

      {/* Custom Context Menu */}
      {!isMobile && contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              handleDeleteEvent(contextMenu.eventId);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            Delete
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap TimelineItem with React.forwardRef to accept refs
const TimelineItem = React.forwardRef(function TimelineItem(
  { event, onUpdateEvent, onTogglePin, onDeleteEvent, onContextMenu, isMobile },
  ref
) {
  const [isEditing, setIsEditing] = useState(event.isNew || false);
  const [editedText, setEditedText] = useState(event.text);
  const [editedDate, setEditedDate] = useState(formatDateForInput(event.date));
  const [isHovered, setIsHovered] = useState(false);
  const editRef = useRef(null);
  const touchTimeout = useRef(null);
  const [showOptions, setShowOptions] = useState(false);

  // Determine event status
  const eventDate = parseISO(event.date);
  const now = new Date();
  const isToday = format(eventDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');

  // Close edit mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (eventOutside) => {
      if (editRef.current && !editRef.current.contains(eventOutside.target)) {
        if (isEditing) {
          handleSave();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, editedText, editedDate]);

  const handleSave = () => {
    if (!editedText.trim()) {
      alert('Event text cannot be empty.');
      return;
    }
    if (!editedDate) {
      alert('Event date cannot be empty.');
      return;
    }
    // Validate date format
    const parsedDate = new Date(editedDate);
    if (isNaN(parsedDate.getTime())) {
      alert('Invalid date format. Please enter a valid date and time.');
      return;
    }
    onUpdateEvent({
      ...event,
      text: editedText,
      date: format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss"),
    });
    setIsEditing(false);
  };

  // Handle saving on Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  // Long press handlers for mobile
  const handleTouchStart = () => {
    touchTimeout.current = setTimeout(() => {
      setShowOptions(true);
    }, 700); // 700ms for long press
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
      ref={ref} // Assign ref to the top-level div
    >
      <div className="timeline-marker"></div>
      <div
        className="timeline-content"
        onClick={() => {
          if (!isToday) setIsEditing(true);
        }}
        ref={editRef}
      >
        {isEditing ? (
          <>
            <div className="edit-container">
              <input
                type="datetime-local"
                className="timeline-date-edit"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyPress={handleKeyPress}
                min="1900-01-01T00:00"
                max="2100-12-31T23:59"
              />
              <textarea
                className="timeline-text-edit"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyPress={handleKeyPress}
              />
            </div>
            {/* Save functionality handled by clicking outside or pressing Enter */}
          </>
        ) : (
          <>
            <div className="timeline-date">
              {format(parseISO(event.date), 'MMMM d, yyyy h:mm a')}
            </div>
            <div className="timeline-text">{event.text}</div>
          </>
        )}

        {/* Pin Icon */}
        {!isEditing && (
          (!isMobile
            ? (isHovered || event.pinned) && (
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
              )
            : event.pinned && (
                <div className="timeline-actions pinned">
                  <FaThumbtack color="#000000" />
                </div>
              ))
        )}
      </div>

      {/* Mobile Options Modal */}
      {isMobile && showOptions && (
        <div className="mobile-options-modal">
          <button onClick={() => handleOptionSelect('pin')} className="option-button">
            {event.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => handleOptionSelect('delete')} className="option-button">
            Delete
          </button>
          <button
            onClick={() => setShowOptions(false)}
            className="option-button cancel-button"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

// Helper functions
function formatDateForInput(dateString) {
  const date = parseISO(dateString);
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60000);
  return adjustedDate.toISOString().slice(0, 16);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default App;