export const getStatusColor = (status?: string) => {
  switch (status) {
    case 'accepted': return '#059669'; // green
    case 'declined': return '#DC2626'; // red
    case 'tentative': return '#D97706'; // yellow
    default: return '#6B7280'; // gray
  }
};

export const getStatusText = (status?: string) => {
  switch (status) {
    case 'accepted': return 'Going';
    case 'declined': return 'Not Going';
    case 'tentative': return 'Maybe';
    default: return 'Pending';
  }
}; 