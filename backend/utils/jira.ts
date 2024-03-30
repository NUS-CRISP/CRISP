import CourseModel from '@models/Course';

export const exchangeCodeForToken = async (code: string) => {
  const tokenUrl = 'https://auth.atlassian.com/oauth/token';
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const redirectUri = `${process.env.FRONTEND_URI}/api/jira/callback`;

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw new Error('Error fetching access token');
  }
};

export const fetchCloudIdsAndUpdateCourse = async (
  accessToken: string,
  refreshToken: string,
  courseId: string
) => {
  const cloudUrl = 'https://api.atlassian.com/oauth/token/accessible-resources';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  };

  try {
    const response = await fetch(cloudUrl, { headers });
    const data = await response.json();

    const cloudIds = data.map((item: { id: string }) => item.id);
    await CourseModel.findOneAndUpdate(
      { _id: courseId },
      {
        jira: {
          isRegistered: true,
          cloudIds: cloudIds,
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
      },
      {}
    );
  } catch (error) {
    console.error('Error fetching cloud IDs and updating course:', error);
    throw new Error('Error fetching cloud IDs and updating course');
  }
};
