
import { AppShell, Header, Title, MediaQuery, Burger, useMantineTheme } from '@mantine/core';
import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from "./Navbar";
import { useState, useEffect, useCallback } from 'react';
import { getIdTokenOfUser, logout } from '../../Providers/Firebase/config';
import { showNotification } from '@mantine/notifications';
import OfflineDetector from '../Login/OfflineDetector';


function Home() {
  const Navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();


  const getUserStatus = useCallback(
    async () => {
      const authId = await getIdTokenOfUser();
      fetch(import.meta.env.VITE_API + "/users/userStatus", {
        headers: {
          Authorization: `Bearer ${authId}`,
        },
      }).then(async (response) => {
        if (response.ok) {
          response.json().then(json => {
            if (json.status == "LOBBY") {
              Navigate(`/waiting/${json.gameId}`)
            } else if (json.status == "GAME_ROOM") {
              Navigate(`/game/${json.gameId}`)
            } else if (json.status == "INACTIVE") {
              showNotification({
                variant: 'outline',
                color: 'red',
                title: 'Something went wrong!',
                message: "User inactive"
              })
              logout()
            }
          })
        } else {
          // throw await response.json()
        }
      }).catch((error) => {
        showNotification({
          variant: 'outline',
          color: 'red',
          title: 'Something went wrong!',
          message: error.msg
        })
      })
    },
    [],
  )


  useEffect(() => {
    getUserStatus();
  }, [getUserStatus])

  return (
    <AppShell
      padding="md"
      navbar={<Navbar opened={opened} setOpened={setOpened}></Navbar>
      }
      header={<Header height={60} p="md" >
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <MediaQuery largerThan="sm" styles={{ display: 'none' }}>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              size="sm"
              color={theme.colors.gray[6]}
              mr="xl"
            />
          </MediaQuery>

          <Title order={4}>Declare Game</Title>
        </div>
      </Header>}
      styles={(theme) => ({
        main: { backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0] },
      })}
    >
      <OfflineDetector />
      <Outlet />
    </AppShell>
  )
}

export default Home;
