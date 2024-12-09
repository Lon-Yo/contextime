// CalendarView.js
import React, { useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, parseISO,
  eachDayOfInterval, startOfDay, isSameDay, isSameMonth,
  addMonths, addYears, startOfYear, endOfYear
} from 'date-fns';

function CalendarView({
  originalTimelineData,
  onContextMenu,
  isMobile,
  handleTogglePin,
  handleDeleteEvent,
  handleDeleteTagFromEvent,
  handleEditTag,
  handleTagEdited
}) {
  const [viewMode, setViewMode] = useState('month'); // 'day', 'week', 'month', 'year'
  const [currentDate, setCurrentDate] = useState(new Date());

  // Group events by day
  const eventsByDay = {};
  originalTimelineData.forEach(event => {
    const eventDate = parseISO(event.date);
    const key = format(eventDate, 'yyyy-MM-dd');
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(event);
  });

  function goToToday() {
    setCurrentDate(new Date());
  }

  function prevPeriod() {
    if (viewMode==='month') {
      setCurrentDate(addMonths(currentDate, -1));
    } else if (viewMode==='week') {
      setCurrentDate(addDays(currentDate, -7));
    } else if (viewMode==='day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode==='year') {
      setCurrentDate(addYears(currentDate, -1));
    }
  }

  function nextPeriod() {
    if (viewMode==='month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewMode==='week') {
      setCurrentDate(addDays(currentDate, 7));
    } else if (viewMode==='day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode==='year') {
      setCurrentDate(addYears(currentDate, 1));
    }
  }

  function renderDayView() {
    // Day view: single column of hours
    const startOfCurrentDay = startOfDay(currentDate);
    const hours = [...Array(24).keys()];
    const dayKey = format(startOfCurrentDay, 'yyyy-MM-dd');
    const dayEvents = eventsByDay[dayKey] || [];

    return (
      <div>
        <h2 style={{textAlign:'center'}}>{format(currentDate, 'MMMM d, yyyy')}</h2>
        <div style={{border:'1px solid var(--border-color)',borderRadius:'0.375rem',overflow:'hidden'}}>
          {hours.map(h=>{
            const slotEvents = dayEvents.filter(ev => format(parseISO(ev.date),'H')===String(h));
            return (
              <div key={h} style={{borderBottom:'1px solid var(--border-color)', padding:'0.5rem'}}>
                <strong>{h}:00</strong>
                {slotEvents.map(ev=>(
                  <div key={ev.id} style={{fontSize:'0.875rem',cursor:'pointer'}} onContextMenu={(e)=>onContextMenu(e, ev.id)}>
                    {ev.text} {ev.pinned?'📌':''}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    // Week view: 7 columns (Sun-Sat), hours rows
    // Start with the Sunday of current week
    const startOfCurrentWeek = startOfWeek(currentDate, {weekStartsOn:0});
    const days = [...Array(7).keys()].map(i=>addDays(startOfCurrentWeek,i));
    const hours = [...Array(24).keys()];

    return (
      <div>
        <h2 style={{textAlign:'center'}}>{format(startOfCurrentWeek,'MMMM d, yyyy')} - {format(addDays(startOfCurrentWeek,6),'MMMM d, yyyy')}</h2>
        <div style={{display:'grid', gridTemplateColumns:'50px repeat(7,1fr)', border:'1px solid var(--border-color)'}}>
          <div></div>
          {days.map((d,i)=><div key={i} style={{textAlign:'center',borderBottom:'1px solid var(--border-color)'}}>{format(d,'EEE MMM d')}</div>)}
          {hours.map(h=>{
            return (
              <React.Fragment key={h}>
                <div style={{borderBottom:'1px solid var(--border-color)',borderRight:'1px solid var(--border-color)',padding:'0.5rem',textAlign:'right'}}>{h}:00</div>
                {days.map((d,di)=>{
                  const dayKey = format(d,'yyyy-MM-dd');
                  const dayEvents = eventsByDay[dayKey]||[];
                  const slotEvents = dayEvents.filter(ev=>format(parseISO(ev.date),'H')===String(h));
                  return (
                    <div key={di} style={{borderBottom:'1px solid var(--border-color)',borderRight:'1px solid var(--border-color)',padding:'0.5rem',minHeight:'40px'}}>
                      {slotEvents.map(ev=>(
                        <div key={ev.id} style={{fontSize:'0.75rem',cursor:'pointer'}} onContextMenu={(e)=>onContextMenu(e, ev.id)}>
                          {ev.text} {ev.pinned?'📌':''}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMonthView() {
    // Month view: as before
    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);
    const startOfCalendar = startOfWeek(startOfCurrentMonth, {weekStartsOn:0});
    const endOfCalendar = endOfWeek(endOfCurrentMonth, {weekStartsOn:0});

    let day = startOfCalendar;
    const calendar = [];
    while (day <= endOfCalendar) {
      const week = [];
      for (let i=0; i<7; i++) {
        week.push(day);
        day = addDays(day,1);
      }
      calendar.push(week);
    }

    return (
      <div>
        <h2 style={{textAlign:'center'}}>{format(currentDate, 'MMMM yyyy')}</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',textAlign:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} style={{fontWeight:'bold'}}>{d}</div>)}
        </div>
        {calendar.map((week,wi)=>(
          <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'0.5rem',marginBottom:'0.5rem'}}>
            {week.map((day,di)=>{
              const dayKey = format(day,'yyyy-MM-dd');
              const dayEvents = eventsByDay[dayKey]||[];
              return (
                <div key={di} style={{border:'1px solid var(--border-color)',borderRadius:'0.375rem',padding:'0.5rem',background:'var(--bg-primary)',textAlign:'left',opacity:isSameMonth(day, currentDate)?1:0.5}}>
                  <div style={{fontWeight:'bold',marginBottom:'0.25rem'}}>{format(day,'d')}</div>
                  {dayEvents.map(ev=>(
                    <div key={ev.id} style={{fontSize:'0.875rem',marginBottom:'0.25rem',cursor:'pointer'}} onContextMenu={(e)=>onContextMenu(e, ev.id)}>
                      {ev.text} {ev.pinned&&'📌'}
                      <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>{format(parseISO(ev.date),'h:mm a')}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  function renderYearView() {
    // Year view: display each month in a small grid
    const startOfThisYear = startOfYear(currentDate);
    const months = [...Array(12).keys()].map(i=>addMonths(startOfThisYear,i));
    return (
      <div>
        <h2 style={{textAlign:'center'}}>{format(currentDate,'yyyy')}</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1rem'}}>
          {months.map((m,i)=>{
            const startM = startOfMonth(m);
            const endM = endOfMonth(m);
            const daysInMonth = eachDayOfInterval({start:startM,end:endM});
            return (
              <div key={i} style={{border:'1px solid var(--border-color)',borderRadius:'0.375rem',padding:'0.5rem'}}>
                <div style={{textAlign:'center',fontWeight:'bold',marginBottom:'0.5rem'}}>{format(m,'MMMM')}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',fontSize:'0.75rem'}}>
                  {['S','M','T','W','T','F','S'].map(d=><div key={d} style={{fontWeight:'bold',textAlign:'center'}}>{d}</div>)}
                  {startOfWeek(startM,{weekStartsOn:0})<startM && Array.from({length:(startM.getDay())}).map((_,idx)=><div key={'empty'+idx}></div>)}
                  {daysInMonth.map((d2,idx)=>{
                    const dayKey = format(d2,'yyyy-MM-dd');
                    const dayEvents = eventsByDay[dayKey]||[];
                    return (
                      <div key={idx} style={{textAlign:'center',padding:'2px',cursor:dayEvents.length?'pointer':'default'}} onContextMenu={(e)=>dayEvents.length>0?onContextMenu(e,dayEvents[0].id):null}>
                        {format(d2,'d')}
                        {dayEvents.length>0 && <div style={{fontSize:'0.5rem',color:'var(--primary-color)'}}>•</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar for switching between day/week/month/year */}
      <div style={{display:'flex',justifyContent:'center',gap:'1rem',marginBottom:'1rem'}}>
        <button onClick={goToToday}>Today</button>
        <button onClick={prevPeriod}>←</button>
        <button onClick={nextPeriod}>→</button>
        <button onClick={()=>setViewMode('day')}>Day</button>
        <button onClick={()=>setViewMode('week')}>Week</button>
        <button onClick={()=>setViewMode('month')}>Month</button>
        <button onClick={()=>setViewMode('year')}>Year</button>
      </div>

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'year' && renderYearView()}
    </div>
  );
}

export default CalendarView;