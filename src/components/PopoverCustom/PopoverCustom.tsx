import React from 'react';
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverBody,
    PopoverArrow,
    Portal,
    List,
    ListItem
} from '@chakra-ui/react';
import { EntryAction, Transition } from '../../myUtils/model/MoreComplexData';

type PopoverCustomProps = {
    children: React.ReactNode;
    action: EntryAction | Transition;
}

const PopoverCustom: React.FC<PopoverCustomProps> = ({ children, action }) => {

    return (
        <Popover trigger='hover'>
            <PopoverTrigger>
                <a>
                    {children}
                </a>
            </PopoverTrigger>
            <Portal>
                <PopoverContent color='white'>
                    <PopoverArrow />
                    <PopoverHeader bg='#006375' fontWeight='bold'>{action.type}</PopoverHeader>
                    <PopoverBody fontSize='xs' fontWeight='bold' bg='#262626'>
                        <List spacing={1}>
                            {Object.entries(action).map(([key, value], index) => (
                                key !== 'type' && (
                                    <ListItem key={index}>
                                        {key && `${key}:  ${JSON.stringify(value)}`}
                                    </ListItem>
                                )
                            ))}
                        </List>
                    </PopoverBody>
                </PopoverContent>
            </Portal>
        </Popover>
    );
}

export default PopoverCustom;