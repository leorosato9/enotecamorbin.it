import ActivityItem from './ActivityItem';

export default function ActivityList({ activities, currentUserEmail, emailToName }) {
  return (
    <div>
      <h2>Le tue attività</h2>
      {activities.length === 0 ? (
        <p>Non hai ancora attività.</p>
      ) : (
        activities.map((att) => (
          <ActivityItem
            key={att._id}
            activity={att}
            currentUserEmail={currentUserEmail}
            emailToName={emailToName}
          />
        ))
      )}
    </div>
  );
}